import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Beef,
  Camera,
  CheckCircle2,
  Flame,
  History,
  Plus,
  Search,
  ShieldAlert,
  Store,
  UtensilsCrossed,
  Wheat,
  X,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/Button";
import CameraCaptureModal from "@/components/CameraCaptureModal";
import { apiClient } from "@/lib/apiClient";
import type { RiskOverview } from "@/lib/riskOverviewTypes";
import { estimateFoodRiskFromImage, scanStructuredDataFromImage } from "@/lib/cameraScan";
import { pushNotification } from "@/lib/notifications";

const macros = [
  { label: "Calories", value: 1845, target: 2200, unit: "kcal", icon: Flame, color: "text-health-rose", bg: "bg-health-rose/12" },
  { label: "Protein", value: 78, target: 120, unit: "g", icon: Beef, color: "text-health-teal", bg: "bg-health-teal/12" },
  { label: "Carbs", value: 220, target: 280, unit: "g", icon: Wheat, color: "text-health-cyan", bg: "bg-health-cyan/12" },
] as const;

type Meal = {
  type: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  items: string;
  calories: number;
  loggedAt: string;
};

type AlertLevel = "green" | "yellow" | "red";

type DishCatalog = {
  id: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sugar_g: number;
  sodium_mg: number;
  fiber_g: number;
  vitamins: string[];
  alert: AlertLevel;
  alert_message: string;
  choose_button_label: string;
  choose_feedback: string;
};

type RestaurantCatalog = {
  id: string;
  name: string;
  cuisine: string;
  dish_count: number;
  dishes: DishCatalog[];
};

type RestaurantCatalogResponse = {
  restaurants: RestaurantCatalog[];
  total: number;
};

type DishSuggestion = {
  restaurant_id: string;
  dish_id: string;
  dish_name: string;
  alert: AlertLevel;
};

type ChooseDishResponse = {
  restaurant_id: string;
  restaurant_name: string;
  dish_id: string;
  dish_name: string;
  alert: AlertLevel;
  message: string;
  interaction_id: number;
  meal_log_id: number;
};

type RestaurantInteractionHistory = {
  id: number;
  restaurant_name: string;
  action: string;
  query_text: string | null;
  dish_name: string | null;
  impact_label: string | null;
  created_at: string;
};

type FoodOverviewSummary = {
  latest_item?: string | null;
  latest_logged_at?: string | null;
  latest_calories?: number | null;
  latest_sodium_mg?: number | null;
  latest_note?: string | null;
  latest_alert?: string | null;
  alert_counts?: { green?: number; yellow?: number; red?: number } | null;
  recent_choices?: number | null;
};

type FoodScanResult = {
  alert: AlertLevel;
  title: string;
  message: string;
  confidence: number;
  scannedAt: string;
};

type MealSwapSuggestion = {
  dish: DishCatalog;
  healthGainScore: number;
  similarityScore: number;
  caloriesDelta: number;
  sodiumDelta: number;
  sugarDelta: number;
  fatDelta: number;
};

const initialMeals: Meal[] = [];

const alertMeta: Record<
  AlertLevel,
  {
    label: string;
    badgeClass: string;
    panelClass: string;
    icon: typeof CheckCircle2;
    chooseButtonClass: string;
    confirmButtonClass: string;
  }
> = {
  green: {
    label: "Green",
    badgeClass: "bg-emerald-500/12 text-emerald-600",
    panelClass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-800",
    icon: CheckCircle2,
    chooseButtonClass: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25",
    confirmButtonClass: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
  yellow: {
    label: "Yellow",
    badgeClass: "bg-yellow-500/12 text-yellow-700",
    panelClass: "border-yellow-500/40 bg-yellow-500/10 text-yellow-800",
    icon: AlertTriangle,
    chooseButtonClass: "border-yellow-500/35 bg-yellow-500/15 text-yellow-800 hover:bg-yellow-500/25",
    confirmButtonClass: "bg-yellow-600 text-white hover:bg-yellow-700",
  },
  red: {
    label: "Red",
    badgeClass: "bg-health-rose/12 text-health-rose",
    panelClass: "border-health-rose/40 bg-health-rose/10 text-health-rose",
    icon: ShieldAlert,
    chooseButtonClass: "border-health-rose/35 bg-health-rose/15 text-health-rose hover:bg-health-rose/25",
    confirmButtonClass: "bg-health-rose text-white hover:bg-health-rose/90",
  },
};

const toAlertLevel = (value: string | null | undefined): AlertLevel => {
  const key = (value ?? "").trim().toLowerCase();
  if (key === "green" || key === "yellow" || key === "red") {
    return key;
  }
  return "yellow";
};

const alertRank: Record<AlertLevel, number> = {
  green: 0,
  yellow: 1,
  red: 2,
};

const dishStopWords = new Set(["with", "and", "the", "style", "special", "masala", "combo"]);

const tokenizeDishName = (name: string): string[] =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !dishStopWords.has(token));

const computeDishSimilarity = (sourceName: string, candidateName: string): number => {
  const sourceTokens = new Set(tokenizeDishName(sourceName));
  const candidateTokens = new Set(tokenizeDishName(candidateName));
  if (!sourceTokens.size || !candidateTokens.size) return 0;

  let overlap = 0;
  for (const token of sourceTokens) {
    if (candidateTokens.has(token)) overlap += 1;
  }
  return overlap / Math.max(sourceTokens.size, candidateTokens.size);
};

const computeHealthGain = (source: DishCatalog, candidate: DishCatalog): number => {
  const alertGain = (alertRank[source.alert] - alertRank[candidate.alert]) * 2.2;
  const caloriesGain = (source.calories - candidate.calories) / 90;
  const sodiumGain = (source.sodium_mg - candidate.sodium_mg) / 220;
  const sugarGain = (source.sugar_g - candidate.sugar_g) / 5.5;
  const fatGain = (source.fat_g - candidate.fat_g) / 7;
  const fiberGain = (candidate.fiber_g - source.fiber_g) / 3;

  return alertGain + caloriesGain + sodiumGain + sugarGain + fatGain + fiberGain;
};

const getMealOptionsByHour = (hour: number): Meal["type"][] => {
  if (hour >= 5 && hour < 11) return ["Breakfast", "Snack"];
  if (hour >= 11 && hour < 16) return ["Lunch", "Snack"];
  if (hour >= 16 && hour < 22) return ["Dinner", "Snack"];
  return ["Snack"];
};

const getDefaultMealType = (hour: number): Meal["type"] => getMealOptionsByHour(hour)[0] ?? "Snack";
const allMealTypes: Meal["type"][] = ["Breakfast", "Lunch", "Dinner", "Snack"];

const vegKeywords = [
  "paneer",
  "dal",
  "naan",
  "roti",
  "salad",
  "veggie",
  "veg ",
  "mushroom",
  "tofu",
  "rajma",
  "chole",
  "aloo",
  "fruit",
  "corn",
  "fries",
  "pizza",
  "pasta",
  "soup",
  "shake",
  "lassi",
  "brownie",
  "ice cream",
];

const nonVegKeywords = [
  "chicken",
  "mutton",
  "fish",
  "egg",
  "shrimp",
  "prawn",
  "meat",
  "beef",
  "biryani",
  "kebab",
  "tikka",
  "sausage",
];

const isVegDish = (dishName: string): boolean => {
  const name = dishName.toLowerCase();
  if (nonVegKeywords.some((keyword) => name.includes(keyword))) {
    return false;
  }
  return vegKeywords.some((keyword) => name.includes(keyword)) || !nonVegKeywords.some((keyword) => name.includes(keyword));
};

const pickScanValue = (payload: Record<string, unknown> | null, keys: string[]): string => {
  if (!payload) return "";
  const loweredPayload = Object.fromEntries(Object.entries(payload).map(([key, value]) => [key.toLowerCase(), value]));
  for (const key of keys) {
    const raw = loweredPayload[key.toLowerCase()];
    if (raw === null || raw === undefined) continue;
    const text = String(raw).trim();
    if (text) return text;
  }
  return "";
};

const deriveDishHintFromRawScanText = (rawValue: string): string => {
  const normalized = rawValue
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!normalized.length) return "";

  const labeledLine = normalized.find((line) => /^(dish|food|meal|item)\s*[:=-]/i.test(line));
  if (labeledLine) {
    const resolved = labeledLine.replace(/^(dish|food|meal|item)\s*[:=-]\s*/i, "").trim();
    if (resolved) return resolved;
  }

  const candidate = normalized.find((line) => {
    if (line.length < 2 || line.length > 72) return false;
    if (/^\d[\d\s/.-]*$/.test(line)) return false;
    return /[a-z]/i.test(line);
  });
  return candidate ?? "";
};

const Food = () => {
  const [activeTab, setActiveTab] = useState<"meal" | "restaurant">("meal");
  const [now, setNow] = useState<Date>(() => new Date());

  const [meals, setMeals] = useState<Meal[]>(initialMeals);
  const [showAdd, setShowAdd] = useState(false);
  const [newMeal, setNewMeal] = useState<{ type: Meal["type"]; items: string; calories: string }>({
    type: getDefaultMealType(new Date().getHours()),
    items: "",
    calories: "",
  });

  const [query, setQuery] = useState("");
  const [dietPreference, setDietPreference] = useState<"all" | "veg" | "non_veg">("all");
  const [restaurantLoading, setRestaurantLoading] = useState(false);
  const [restaurantError, setRestaurantError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<RestaurantCatalog[]>([]);

  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);

  const [menuQuery, setMenuQuery] = useState("");
  const [suggestions, setSuggestions] = useState<DishSuggestion[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const [pendingChoice, setPendingChoice] = useState<{ dishId: string; dishName: string; alert: AlertLevel; message: string } | null>(null);
  const [confirmingChoice, setConfirmingChoice] = useState(false);
  const [chooseResult, setChooseResult] = useState<{ alert: AlertLevel; message: string; dishId: string } | null>(null);

  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<RestaurantInteractionHistory[]>([]);
  const [historyFoodSummary, setHistoryFoodSummary] = useState<FoodOverviewSummary | null>(null);
  const [showFoodCamera, setShowFoodCamera] = useState(false);
  const [isFoodScanProcessing, setIsFoodScanProcessing] = useState(false);
  const [foodScanResult, setFoodScanResult] = useState<FoodScanResult | null>(null);
  const [showAllSwapOptions, setShowAllSwapOptions] = useState(false);

  const addMeal = () => {
    if (!newMeal.items.trim()) return;

    const mealLabel = newMeal.type;
    const mealItems = newMeal.items.trim();
    const loggedAt = new Date().toISOString();
    setMeals((prev) => [
      {
        type: mealLabel,
        items: mealItems,
        calories: Number.parseInt(newMeal.calories, 10) || 0,
        loggedAt,
      },
      ...prev,
    ]);
    pushNotification({
      type: "food",
      title: "Food logged",
      message: `You logged ${mealItems} in ${mealLabel}.`,
    });

    setNewMeal({ type: getDefaultMealType(new Date().getHours()), items: "", calories: "" });
    setShowAdd(false);
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const todaysMeals = useMemo(() => {
    const todayKey = now.toDateString();
    return meals.filter((meal) => new Date(meal.loggedAt).toDateString() === todayKey);
  }, [meals, now]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    const [historyResponse, overviewResponse] = await Promise.all([
      apiClient.get<RestaurantInteractionHistory[]>("/restaurant/interactions?limit=120"),
      apiClient.get<RiskOverview>("/risk/overview"),
    ]);

    setHistoryFoodSummary(overviewResponse.data?.food ?? null);

    if (historyResponse.data) {
      const choicesOnly = historyResponse.data.filter((item) => item.action === "choose_dish" && item.dish_name);
      setHistoryItems(choicesOnly);
    } else {
      setHistoryItems([]);
      setHistoryError(historyResponse.error ?? "Unable to load history right now.");
    }
    setHistoryLoading(false);
  };

  const openHistory = () => {
    setShowHistory(true);
    void loadHistory();
  };

  useEffect(() => {
    if (activeTab !== "restaurant") return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setRestaurantLoading(true);
      setRestaurantError(null);

      const params = new URLSearchParams();
      if (query.trim()) {
        params.set("q", query.trim());
      }
      const endpoint = params.size ? `/restaurant/catalog?${params.toString()}` : "/restaurant/catalog";

      const response = await apiClient.get<RestaurantCatalogResponse>(endpoint);
      if (cancelled) return;

      if (response.error || !response.data) {
        setRestaurants([]);
        setRestaurantError(response.error ?? "Unable to load restaurants right now.");
        setSelectedRestaurantId(null);
        setSelectedDishId(null);
        setRestaurantLoading(false);
        return;
      }

      setRestaurants(response.data.restaurants);
      setSelectedRestaurantId((current) => {
        if (current && response.data?.restaurants.some((restaurant) => restaurant.id === current)) {
          return current;
        }
        return null;
      });
      setRestaurantLoading(false);
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeTab, query]);

  const selectedRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === selectedRestaurantId) ?? null,
    [restaurants, selectedRestaurantId],
  );

  useEffect(() => {
    if (!selectedRestaurant) {
      setSelectedDishId(null);
      setPendingChoice(null);
      return;
    }

    const allowedDishIds =
      dietPreference === "veg"
        ? new Set(selectedRestaurant.dishes.filter((dish) => isVegDish(dish.name)).map((dish) => dish.id))
        : null;

    setSelectedDishId((current) => {
      if (
        current &&
        selectedRestaurant.dishes.some((dish) => dish.id === current) &&
        (!allowedDishIds || allowedDishIds.has(current))
      ) {
        return current;
      }
      return null;
    });
  }, [dietPreference, selectedRestaurant]);

  useEffect(() => {
    if (!selectedRestaurant || !menuQuery.trim()) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSuggestionLoading(true);
      const params = new URLSearchParams({
        restaurant_id: selectedRestaurant.id,
        q: menuQuery.trim(),
        limit: "8",
      });
      const response = await apiClient.get<DishSuggestion[]>(`/restaurant/suggestions?${params.toString()}`);
      if (cancelled) return;
      setSuggestions(response.data ?? []);
      setSuggestionLoading(false);
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [menuQuery, selectedRestaurant]);

  useEffect(() => {
    if (!selectedRestaurant) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedRestaurant]);

  const selectedDish = selectedRestaurant?.dishes.find((dish) => dish.id === selectedDishId) ?? null;

  useEffect(() => {
    setShowAllSwapOptions(false);
  }, [selectedDishId, selectedRestaurantId]);

  const mealSwapSuggestions = useMemo(() => {
    if (!selectedRestaurant || !selectedDish || selectedDish.alert === "green") {
      return [];
    }

    const candidatePool =
      dietPreference === "veg"
        ? selectedRestaurant.dishes.filter((dish) => isVegDish(dish.name))
        : selectedRestaurant.dishes;

    const ranked = candidatePool
      .filter((dish) => dish.id !== selectedDish.id)
      .map((dish) => {
        const similarityScore = computeDishSimilarity(selectedDish.name, dish.name);
        const healthGainScore = computeHealthGain(selectedDish, dish);
        return {
          dish,
          healthGainScore,
          similarityScore,
          caloriesDelta: dish.calories - selectedDish.calories,
          sodiumDelta: Number((dish.sodium_mg - selectedDish.sodium_mg).toFixed(1)),
          sugarDelta: Number((dish.sugar_g - selectedDish.sugar_g).toFixed(1)),
          fatDelta: Number((dish.fat_g - selectedDish.fat_g).toFixed(1)),
        } satisfies MealSwapSuggestion;
      })
      .filter((item) => item.healthGainScore > 0.2)
      .sort(
        (left, right) =>
          right.healthGainScore - left.healthGainScore ||
          right.similarityScore - left.similarityScore ||
          left.dish.sodium_mg - right.dish.sodium_mg ||
          left.dish.calories - right.dish.calories,
      );

    return ranked.slice(0, 3);
  }, [dietPreference, selectedDish, selectedRestaurant]);

  const visibleMealSwapSuggestions = useMemo(
    () => (showAllSwapOptions ? mealSwapSuggestions : mealSwapSuggestions.slice(0, 1)),
    [mealSwapSuggestions, showAllSwapOptions],
  );

  const restaurantCards = useMemo(() => {
    if (dietPreference !== "veg") {
      return restaurants;
    }
    return restaurants.filter((restaurant) => restaurant.dishes.some((dish) => isVegDish(dish.name)));
  }, [dietPreference, restaurants]);

  const dishPoolForSuggestions = useMemo(() => {
    const source = selectedRestaurant ? selectedRestaurant.dishes : restaurantCards.flatMap((restaurant) => restaurant.dishes);
    if (dietPreference !== "veg") {
      return source;
    }
    return source.filter((dish) => isVegDish(dish.name));
  }, [dietPreference, restaurantCards, selectedRestaurant]);

  const filteredDishes = useMemo(() => {
    if (!selectedRestaurant) return [];

    let source = selectedRestaurant.dishes;
    if (dietPreference === "veg") {
      source = source.filter((dish) => isVegDish(dish.name));
    }

    const q = menuQuery.trim().toLowerCase();
    if (!q) return source;

    return source.filter((dish) => dish.name.toLowerCase().includes(q));
  }, [dietPreference, menuQuery, selectedRestaurant]);

  const visibleSuggestions = useMemo(() => {
    const fromApi = suggestions;
    if (dietPreference !== "veg" || !selectedRestaurant) {
      return fromApi;
    }
    const allowedDishIds = new Set(
      selectedRestaurant.dishes.filter((dish) => isVegDish(dish.name)).map((dish) => dish.id),
    );
    return fromApi.filter((suggestion) => allowedDishIds.has(suggestion.dish_id));
  }, [dietPreference, selectedRestaurant, suggestions]);

  const recommendedDishes = useMemo(() => {
    if (!selectedRestaurant) return [];

    const rank: Record<AlertLevel, number> = { green: 0, yellow: 1, red: 2 };

    const source =
      dietPreference === "veg"
        ? selectedRestaurant.dishes.filter((dish) => isVegDish(dish.name))
        : selectedRestaurant.dishes;

    return [...source]
      .sort((left, right) => rank[left.alert] - rank[right.alert] || left.calories - right.calories)
      .slice(0, 3);
  }, [dietPreference, selectedRestaurant]);

  const quickSuggestions = useMemo(() => {
    const hour = now.getHours();
    const queryKey = hour >= 16 ? "dinner" : hour >= 11 ? "lunch" : "breakfast";
    const filtered = dishPoolForSuggestions
      .filter((dish) => dish.name.toLowerCase().includes(queryKey) || dish.alert === "green")
      .slice(0, 4);

    return filtered.map((dish) => dish.name);
  }, [dishPoolForSuggestions, now]);

  useEffect(() => {
    if (!selectedRestaurantId) return;
    if (restaurantCards.some((restaurant) => restaurant.id === selectedRestaurantId)) return;
    setSelectedRestaurantId(null);
    setSelectedDishId(null);
    setPendingChoice(null);
  }, [restaurantCards, selectedRestaurantId]);

  const closeRestaurantModal = () => {
    setSelectedRestaurantId(null);
    setSelectedDishId(null);
    setMenuQuery("");
    setSuggestions([]);
    setPendingChoice(null);
    setChooseResult(null);
    setShowAllSwapOptions(false);
  };

  const stageDishChoice = (dish: DishCatalog) => {
    setSelectedDishId(dish.id);
    setPendingChoice({
      dishId: dish.id,
      dishName: dish.name,
      alert: dish.alert,
      message: dish.choose_feedback,
    });
    setChooseResult(null);
  };

  const cancelDishChoice = () => {
    setPendingChoice(null);
    setChooseResult(null);
  };

  const toggleDishChoice = (dish: DishCatalog) => {
    if (pendingChoice?.dishId === dish.id) {
      cancelDishChoice();
      return;
    }
    stageDishChoice(dish);
  };

  const confirmDishChoice = async () => {
    if (!selectedRestaurant || !pendingChoice) return;

    setConfirmingChoice(true);
    setRestaurantError(null);

    const response = await apiClient.post<ChooseDishResponse>("/restaurant/choose", {
      restaurant_id: selectedRestaurant.id,
      dish_id: pendingChoice.dishId,
    });

    if (response.data) {
      setChooseResult({ alert: response.data.alert, message: response.data.message, dishId: response.data.dish_id });
      setSelectedDishId(response.data.dish_id);
      setPendingChoice(null);
      pushNotification({
        type: "food",
        title: "Food choice saved",
        message: `You chose ${response.data.dish_name} from ${response.data.restaurant_name}.`,
      });
      if (showHistory) {
        void loadHistory();
      }
    } else {
      setChooseResult({ alert: pendingChoice.alert, message: pendingChoice.message, dishId: pendingChoice.dishId });
      if (response.error) {
        setRestaurantError(response.error);
      }
    }

    setConfirmingChoice(false);
  };

  const handleFoodCameraScan = async (imageDataUrl: string) => {
    setIsFoodScanProcessing(true);
    setRestaurantError(null);

    try {
      const scanResult = await scanStructuredDataFromImage(imageDataUrl);
      const detectedDishHint =
        pickScanValue(scanResult?.parsed ?? null, ["dish_name", "food_name", "meal", "item", "dish", "food"]) ||
        deriveDishHintFromRawScanText(scanResult?.rawValue ?? "") ||
        "";

      let matchedDish: DishCatalog | null = null;
      let matchedRestaurantName = "";
      if (detectedDishHint) {
        const catalogResponse = await apiClient.get<RestaurantCatalogResponse>(
          `/restaurant/catalog?q=${encodeURIComponent(detectedDishHint)}`,
        );
        if (catalogResponse.data?.restaurants?.length) {
          const hint = detectedDishHint.toLowerCase();
          for (const restaurant of catalogResponse.data.restaurants) {
            const foundDish = restaurant.dishes.find((dish) => {
              const dishName = dish.name.toLowerCase();
              return dishName.includes(hint) || hint.includes(dishName);
            });
            if (foundDish) {
              matchedDish = foundDish;
              matchedRestaurantName = restaurant.name;
              break;
            }
          }
        }
      }

      let resultPayload: FoodScanResult;
      if (matchedDish) {
        resultPayload = {
          alert: matchedDish.alert,
          title: `Detected ${matchedDish.name}`,
          message: `${matchedDish.alert_message} Matched from ${scanResult?.source === "ocr" ? "photo text" : "QR"} scan.`,
          confidence: 0.86,
          scannedAt: new Date().toISOString(),
        };
      } else {
        const estimated = await estimateFoodRiskFromImage(imageDataUrl);
        resultPayload = {
          alert: estimated.alert,
          title: detectedDishHint ? `Detected ${detectedDishHint}` : "Camera Food Scan",
          message: estimated.reasons.join(" "),
          confidence: estimated.confidence,
          scannedAt: new Date().toISOString(),
        };
      }

      setFoodScanResult(resultPayload);

      await apiClient.post("/restaurant/interactions", {
        restaurant_name: matchedRestaurantName || "Camera Scan",
        action: "camera_scan",
        query_text: detectedDishHint || "image_scan",
        dish_name: matchedDish?.name || detectedDishHint || null,
        impact_label: resultPayload.alert,
      });

      pushNotification({
        type: "food",
        title: "Food scan completed",
        message: `${resultPayload.title} - ${alertMeta[resultPayload.alert].label} risk`,
      });

      if (matchedDish) {
        setActiveTab("restaurant");
        setQuery(matchedDish.name);
      }

      if (showHistory) {
        void loadHistory();
      }

      setShowFoodCamera(false);
    } catch (error) {
      setRestaurantError(error instanceof Error ? error.message : "Unable to scan food from camera.");
    } finally {
      setIsFoodScanProcessing(false);
    }
  };

  return (
    <AppLayout title="Food" subtitle="Track nutrition and choose better restaurant dishes with health-aware guidance.">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-2xl border border-border/60 bg-card/55 p-1">
          <Button type="button" variant={activeTab === "meal" ? "default" : "ghost"} className="h-10 rounded-xl px-5" onClick={() => setActiveTab("meal")}>
            <UtensilsCrossed className="h-4 w-4" />
            Meal
          </Button>
          <Button type="button" variant={activeTab === "restaurant" ? "default" : "ghost"} className="h-10 rounded-xl px-5" onClick={() => setActiveTab("restaurant")}>
            <Store className="h-4 w-4" />
            Restaurants
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "meal" ? (
            <Button type="button" className="h-10 rounded-xl bg-primary px-4 text-primary-foreground" onClick={() => setShowAdd((prev) => !prev)}>
              <Plus className="h-4 w-4" />
              Add Meal
            </Button>
          ) : null}
          <Button type="button" variant="outline" className="h-10 rounded-xl px-4" onClick={() => setShowFoodCamera(true)}>
            <Camera className="h-4 w-4" />
            Scan Food
          </Button>
          <Button type="button" variant="outline" className="h-10 rounded-xl px-4" onClick={openHistory}>
            <History className="h-4 w-4" />
            History
          </Button>
        </div>
      </section>

      {foodScanResult ? (
        <section className={`rounded-2xl border bg-card/60 p-4 ${alertMeta[foodScanResult.alert].panelClass}`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{foodScanResult.title}</p>
              <p className="mt-1 text-xs">{foodScanResult.message}</p>
            </div>
            <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${alertMeta[foodScanResult.alert].badgeClass}`}>
              {alertMeta[foodScanResult.alert].label} risk
            </span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Confidence {(foodScanResult.confidence * 100).toFixed(0)}% | {new Date(foodScanResult.scannedAt).toLocaleString()}
          </p>
        </section>
      ) : null}

      {activeTab === "meal" ? (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {macros.map((macro, index) => (
              <motion.article
                key={macro.label}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card rounded-3xl border-border/50 p-5"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${macro.bg}`}>
                    <macro.icon className={`h-4 w-4 ${macro.color}`} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{macro.label}</span>
                </div>
                <p className="text-xl font-bold">
                  {macro.value}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    / {macro.target}
                    {macro.unit}
                  </span>
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min((macro.value / macro.target) * 100, 100)}%` }} />
                </div>
              </motion.article>
            ))}
          </section>

          {showAdd ? (
            <motion.section initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-3xl border-border/50 p-4">
              <div className="grid gap-3 md:grid-cols-[170px_minmax(0,1fr)_130px_auto]">
                <select
                  value={newMeal.type}
                  onChange={(event) => setNewMeal((prev) => ({ ...prev, type: event.target.value as Meal["type"] }))}
                  className="h-11 appearance-none rounded-xl border border-border/60 bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/25"
                >
                  {allMealTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <input
                  value={newMeal.items}
                  onChange={(event) => setNewMeal((prev) => ({ ...prev, items: event.target.value }))}
                  placeholder="Meal items"
                  className="h-11 rounded-xl border border-border/60 bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/25"
                />
                <input
                  type="number"
                  min={0}
                  value={newMeal.calories}
                  onChange={(event) => setNewMeal((prev) => ({ ...prev, calories: event.target.value }))}
                  placeholder="Calories"
                  className="h-11 rounded-xl border border-border/60 bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/25"
                />
                <Button type="button" className="h-11 rounded-xl bg-primary px-5 text-primary-foreground" onClick={addMeal}>
                  Add
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                You can log any meal type now. Use breakfast/lunch options for tomorrow planning if needed.
              </p>
            </motion.section>
          ) : null}

          <section className="glass-card rounded-3xl border-border/50 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
              Today's Meals
            </h2>
            {todaysMeals.length ? (
              <div className="space-y-3">
                {todaysMeals.map((meal, index) => (
                  <motion.article
                    key={`${meal.type}-${meal.loggedAt}-${index}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/55 p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold">{meal.type}</p>
                      <p className="text-xs text-muted-foreground">{meal.items}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{meal.calories} kcal</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(meal.loggedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </motion.article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-card/45 p-4 text-sm text-muted-foreground">
                No meals added for today yet. Use Add Meal to track today's food.
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          <section className="glass-card rounded-3xl border-border/50 p-4 sm:p-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search restaurants or dishes"
                className="h-11 w-full rounded-xl border border-border/60 bg-card px-10 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/25"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { key: "all", label: "All" },
                { key: "veg", label: "Veg Only" },
                { key: "non_veg", label: "Non-Veg" },
              ].map((option) => (
                <Button
                  key={option.key}
                  type="button"
                  variant={dietPreference === option.key ? "default" : "outline"}
                  className="h-8 rounded-lg px-3 text-xs"
                  onClick={() => setDietPreference(option.key as "all" | "veg" | "non_veg")}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            {quickSuggestions.length ? (
              <div className="mt-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">What to eat now</p>
                <div className="flex flex-wrap gap-2">
                  {quickSuggestions.map((name) => (
                    <span key={name} className="rounded-full border border-border/60 bg-card px-3 py-1 text-xs text-muted-foreground">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {restaurantError ? <p className="mt-3 text-sm text-health-rose">{restaurantError}</p> : null}
          </section>

          {restaurantLoading ? (
            <section className="glass-card rounded-3xl border-border/50 p-6 text-sm text-muted-foreground">Loading restaurants...</section>
          ) : (
            <section className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {restaurantCards.length ? (
                restaurantCards.map((restaurant, index) => (
                  <motion.button
                    key={restaurant.id}
                    type="button"
                    onClick={() => {
                      setSelectedRestaurantId(restaurant.id);
                      setSelectedDishId(null);
                      setMenuQuery("");
                      setPendingChoice(null);
                      setChooseResult(null);
                    }}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="glass-card hover-lift rounded-3xl border-border/50 p-4 text-left sm:p-5"
                  >
                    <div className="mb-4 inline-flex rounded-xl bg-primary/12 px-2.5 py-1 text-xs font-semibold text-primary">{restaurant.cuisine}</div>
                    <h3 className="text-lg font-bold">{restaurant.name}</h3>
                    <p className="mt-2 text-xs text-muted-foreground">{restaurant.dish_count} dishes available</p>
                  </motion.button>
                ))
              ) : (
                <div className="glass-card col-span-full rounded-3xl border-border/50 p-6 text-sm text-muted-foreground">
                  No restaurants found for this search.
                </div>
              )}
            </section>
          )}
        </>
      )}

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {selectedRestaurant ? (
                <motion.div className="fixed inset-0 z-[100]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <button type="button" className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={closeRestaurantModal} />

                  <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
                    <motion.section
                      initial={{ opacity: 0, scale: 0.96, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: 20 }}
                      transition={{ duration: 0.2 }}
                      className="flex h-full max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-[0_32px_80px_-28px_hsl(215_40%_5%/0.75)]"
                    >
                      <div className="flex items-center justify-between border-b border-border/60 px-4 py-4 sm:px-6">
                        <div className="min-w-0">
                          <h3 className="truncate text-xl font-bold">{selectedRestaurant.name}</h3>
                          <p className="text-sm text-muted-foreground">Search dishes, view alert level, then choose.</p>
                        </div>
                        <Button type="button" size="icon" variant="ghost" className="h-10 w-10 rounded-xl" onClick={closeRestaurantModal}>
                          <X className="h-5 w-5" />
                        </Button>
                      </div>

                      <div className="grid flex-1 min-h-0 gap-4 overflow-y-auto overflow-x-hidden p-4 sm:p-6 2xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                        <article className="order-2 min-w-0 2xl:order-1">
                          <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Menu List</h4>

                          <div className="mb-4 rounded-2xl border border-border/60 bg-card/70 p-3">
                            <div className="relative">
                              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <input
                                type="text"
                                value={menuQuery}
                                onChange={(event) => setMenuQuery(event.target.value)}
                                placeholder="Search dishes in this restaurant"
                                className="h-10 w-full rounded-xl border border-border/60 bg-card px-9 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/25"
                              />
                            </div>

                            {menuQuery.trim() ? (
                              <div className="mt-3 space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Suggestions</p>
                                {suggestionLoading ? (
                                  <p className="text-xs text-muted-foreground">Loading suggestions...</p>
                                ) : visibleSuggestions.length ? (
                                  <div className="flex flex-wrap gap-2">
                                    {visibleSuggestions.map((suggestion) => (
                                      <button
                                        key={suggestion.dish_id}
                                        type="button"
                                        className="rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs hover:border-primary/40"
                                        onClick={() => {
                                          setSelectedDishId(suggestion.dish_id);
                                          setMenuQuery(suggestion.dish_name);
                                        }}
                                      >
                                        {suggestion.dish_name}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground">No dish suggestions for this search.</p>
                                )}
                              </div>
                            ) : null}
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            {filteredDishes.length ? (
                              filteredDishes.map((dish) => {
                                const meta = alertMeta[dish.alert];
                                return (
                                  <div
                                    key={dish.id}
                                    className={`rounded-2xl border p-4 text-left transition ${
                                      selectedDishId === dish.id
                                        ? "border-primary bg-primary/12 shadow-[0_16px_40px_-24px_hsl(var(--primary)/0.7)]"
                                        : "border-border/60 bg-card/70"
                                    }`}
                                  >
                                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                      <button type="button" className="text-left" onClick={() => setSelectedDishId(dish.id)}>
                                        <p className="text-sm font-semibold">{dish.name}</p>
                                      </button>
                                      <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${meta.badgeClass}`}>{meta.label}</span>
                                    </div>
                                    <div className="mb-3 text-[11px] text-muted-foreground">
                                      {dish.calories} kcal | Protein {dish.protein_g} g | Sodium {dish.sodium_mg} mg
                                    </div>
                                    <Button
                                      type="button"
                                      className={`h-8 rounded-lg border px-3 text-xs ${meta.chooseButtonClass}`}
                                      onClick={() => toggleDishChoice(dish)}
                                    >
                                      {pendingChoice?.dishId === dish.id ? "Cancel" : dish.choose_button_label}
                                    </Button>

                                    <AnimatePresence>
                                      {selectedDishId === dish.id ? (
                                        <motion.div
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{ opacity: 1, height: "auto" }}
                                          exit={{ opacity: 0, height: 0 }}
                                          transition={{ duration: 0.2 }}
                                          className="mt-3 space-y-2 overflow-hidden md:hidden"
                                        >
                                          <p className="text-xs text-muted-foreground">{dish.alert_message}</p>
                                          <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                                            <div className="rounded-lg border border-border/60 bg-card/80 px-2 py-1">Calories: {dish.calories}</div>
                                            <div className="rounded-lg border border-border/60 bg-card/80 px-2 py-1">Protein: {dish.protein_g} g</div>
                                            <div className="rounded-lg border border-border/60 bg-card/80 px-2 py-1">Carbs: {dish.carbs_g} g</div>
                                            <div className="rounded-lg border border-border/60 bg-card/80 px-2 py-1">Fat: {dish.fat_g} g</div>
                                          </div>
                                          <div className="rounded-lg border border-border/60 bg-card/80 px-2 py-1 text-[11px] text-muted-foreground">
                                            Vitamins: {dish.vitamins.length ? dish.vitamins.join(", ") : "Not specified"}
                                          </div>

                                          {selectedDishId === dish.id && dish.alert !== "green" ? (
                                            <div className="rounded-lg border border-primary/30 bg-primary/10 p-2 text-[11px] text-muted-foreground">
                                              <p className="mb-1 font-semibold text-foreground">Safer Swap Suggestion</p>
                                              {mealSwapSuggestions.length ? (
                                                <>
                                                  <div className="space-y-2">
                                                    {visibleMealSwapSuggestions.map((swap) => (
                                                    <div key={`swap-mobile-${swap.dish.id}`} className="rounded-md border border-border/60 bg-card/70 p-2">
                                                      <div className="flex items-center justify-between gap-2">
                                                        <p className="text-[11px] font-semibold text-foreground">{swap.dish.name}</p>
                                                        <span className={`inline-flex rounded-full px-2 py-0.5 ${alertMeta[swap.dish.alert].badgeClass}`}>
                                                          {alertMeta[swap.dish.alert].label}
                                                        </span>
                                                      </div>
                                                      <p className="mt-1">Better by: sodium {swap.sodiumDelta < 0 ? `${Math.abs(swap.sodiumDelta)} mg lower` : `${swap.sodiumDelta} mg`}</p>
                                                      <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="mt-2 h-6 rounded-md px-2 text-[10px]"
                                                        onClick={() => stageDishChoice(swap.dish)}
                                                      >
                                                        Choose this swap
                                                      </Button>
                                                    </div>
                                                    ))}
                                                  </div>
                                                  {mealSwapSuggestions.length > 1 ? (
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      className="mt-2 h-6 rounded-md px-2 text-[10px]"
                                                      onClick={() => setShowAllSwapOptions((prev) => !prev)}
                                                    >
                                                      {showAllSwapOptions ? "Show fewer options" : `Show ${mealSwapSuggestions.length - 1} more option(s)`}
                                                    </Button>
                                                  ) : null}
                                                </>
                                              ) : (
                                                <p>No clearly safer same-menu alternative found for this dish.</p>
                                              )}
                                            </div>
                                          ) : null}

                                          {pendingChoice?.dishId === dish.id ? (
                                            <div className={`rounded-lg border p-2 text-xs ${alertMeta[pendingChoice.alert].panelClass}`}>
                                              <p>{pendingChoice.message}</p>
                                              <div className="mt-2 flex items-center justify-end gap-2">
                                                <Button type="button" variant="outline" className="h-7 rounded-md px-2 text-[11px]" onClick={cancelDishChoice}>
                                                  Cancel
                                                </Button>
                                                <Button
                                                  type="button"
                                                  className={`h-7 rounded-md px-2 text-[11px] ${alertMeta[pendingChoice.alert].confirmButtonClass}`}
                                                  onClick={confirmDishChoice}
                                                  disabled={confirmingChoice}
                                                >
                                                  {confirmingChoice ? "Confirming..." : "Confirm"}
                                                </Button>
                                              </div>
                                            </div>
                                          ) : chooseResult?.dishId === dish.id ? (
                                            <div className={`rounded-lg border p-2 text-xs ${alertMeta[chooseResult.alert].panelClass}`}>
                                              {chooseResult.message}
                                            </div>
                                          ) : null}
                                        </motion.div>
                                      ) : null}
                                    </AnimatePresence>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="rounded-2xl border border-dashed border-border/70 bg-card/45 p-4 text-sm text-muted-foreground">
                                No dishes found for this menu search.
                              </div>
                            )}
                          </div>
                        </article>

                        <article className="order-1 min-w-0 space-y-4 2xl:order-2">
                          <div className="rounded-2xl border border-border/60 bg-card/65 p-4">
                            <p className="text-sm font-semibold text-primary">Suggested first</p>
                            <div className="mt-3 grid gap-2">
                              {recommendedDishes.map((dish) => {
                                const meta = alertMeta[dish.alert];
                                return (
                                  <div key={dish.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/80 p-2.5">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold">{dish.name}</p>
                                      <p className="text-xs text-muted-foreground">{dish.calories} kcal | Protein {dish.protein_g} g</p>
                                    </div>
                                    <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${meta.badgeClass}`}>{meta.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {selectedDish ? (
                            <div className="hidden rounded-2xl border border-border/60 bg-card/65 p-4 md:block">
                              {(() => {
                                const meta = alertMeta[selectedDish.alert];
                                return (
                                  <>
                                    <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}>{meta.label} alert</div>
                                    <p className="mt-3 text-sm font-semibold">{selectedDish.name}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">{selectedDish.alert_message}</p>

                                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                      <div className="rounded-xl border border-border/60 bg-card/80 p-2">Calories: {selectedDish.calories}</div>
                                      <div className="rounded-xl border border-border/60 bg-card/80 p-2">Protein: {selectedDish.protein_g} g</div>
                                      <div className="rounded-xl border border-border/60 bg-card/80 p-2">Carbs: {selectedDish.carbs_g} g</div>
                                      <div className="rounded-xl border border-border/60 bg-card/80 p-2">Fat: {selectedDish.fat_g} g</div>
                                      <div className="rounded-xl border border-border/60 bg-card/80 p-2">Fiber: {selectedDish.fiber_g} g</div>
                                      <div className="rounded-xl border border-border/60 bg-card/80 p-2">Sodium: {selectedDish.sodium_mg} mg</div>
                                    </div>

                                    <div className="mt-3 rounded-xl border border-border/60 bg-card/80 p-3 text-xs text-muted-foreground">
                                      Vitamins: {selectedDish.vitamins.length ? selectedDish.vitamins.join(", ") : "Not specified"}
                                    </div>

                                    {selectedDish.alert !== "green" ? (
                                      <div className="mt-3 rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs">
                                        <p className="mb-2 font-semibold text-foreground">Safer Swap Suggestion</p>
                                        {mealSwapSuggestions.length ? (
                                          <>
                                            <div className="space-y-2">
                                              {visibleMealSwapSuggestions.map((swap) => (
                                              <div key={`swap-desktop-${swap.dish.id}`} className="rounded-lg border border-border/60 bg-card/80 p-2.5 text-muted-foreground">
                                                <div className="flex items-center justify-between gap-2">
                                                  <p className="text-xs font-semibold text-foreground">{swap.dish.name}</p>
                                                  <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${alertMeta[swap.dish.alert].badgeClass}`}>
                                                    {alertMeta[swap.dish.alert].label}
                                                  </span>
                                                </div>
                                                <p className="mt-1">
                                                  Sodium change: {swap.sodiumDelta < 0 ? `-${Math.abs(swap.sodiumDelta)} mg` : `+${swap.sodiumDelta} mg`} | Calories{" "}
                                                  {swap.caloriesDelta < 0 ? `-${Math.abs(swap.caloriesDelta)}` : `+${swap.caloriesDelta}`}
                                                </p>
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  className="mt-2 h-7 rounded-md px-2 text-[11px]"
                                                  onClick={() => stageDishChoice(swap.dish)}
                                                >
                                                  Choose this swap
                                                </Button>
                                              </div>
                                              ))}
                                            </div>
                                            {mealSwapSuggestions.length > 1 ? (
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                className="mt-2 h-7 rounded-md px-2 text-[11px]"
                                                onClick={() => setShowAllSwapOptions((prev) => !prev)}
                                              >
                                                {showAllSwapOptions ? "Show fewer options" : `Show ${mealSwapSuggestions.length - 1} more option(s)`}
                                              </Button>
                                            ) : null}
                                          </>
                                        ) : (
                                          <p className="text-muted-foreground">No clearly safer same-menu alternative found for this dish.</p>
                                        )}
                                      </div>
                                    ) : null}

                                    {pendingChoice ? (
                                      <div className={`mt-4 rounded-xl border p-3 text-sm ${alertMeta[pendingChoice.alert].panelClass}`}>
                                        <p>{pendingChoice.message}</p>
                                        <div className="mt-3 flex justify-end gap-2">
                                          <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-xs" onClick={cancelDishChoice}>
                                            Cancel
                                          </Button>
                                          <Button
                                            type="button"
                                            className={`h-8 rounded-lg px-3 text-xs ${
                                              alertMeta[pendingChoice.alert].confirmButtonClass
                                            }`}
                                            onClick={confirmDishChoice}
                                            disabled={confirmingChoice}
                                          >
                                            {confirmingChoice ? "Confirming..." : "Confirm"}
                                          </Button>
                                        </div>
                                      </div>
                                    ) : chooseResult?.dishId === selectedDish.id ? (
                                      <div className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-sm ${alertMeta[chooseResult.alert].panelClass}`}>
                                        {(() => {
                                          const ConfirmIcon = alertMeta[chooseResult.alert].icon;
                                          return <ConfirmIcon className="mt-0.5 h-4 w-4 shrink-0" />;
                                        })()}
                                        <p>{chooseResult.message}</p>
                                      </div>
                                    ) : (
                                      <div className="mt-4 rounded-xl border border-border/60 bg-card/80 p-3 text-xs text-muted-foreground">
                                        Press <span className="font-semibold">Choose</span>, then <span className="font-semibold">Confirm</span> to save in food analysis.
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          ) : (
                            <div className="hidden rounded-2xl border border-dashed border-border/70 bg-card/45 p-4 text-sm text-muted-foreground md:block">
                              Select any dish to see nutrition and alert guidance.
                            </div>
                          )}
                        </article>
                      </div>
                    </motion.section>
                  </div>
                </motion.div>
              ) : null}

              {showHistory ? (
                <motion.div className="fixed inset-0 z-[110]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <button type="button" className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
                  <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
                    <motion.section
                      initial={{ opacity: 0, scale: 0.96, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: 20 }}
                      transition={{ duration: 0.2 }}
                      className="flex h-full max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-[0_32px_80px_-28px_hsl(215_40%_5%/0.75)]"
                    >
                      <div className="flex items-center justify-between border-b border-border/60 px-4 py-4 sm:px-6">
                        <div>
                          <h3 className="text-xl font-bold">Food History</h3>
                          <p className="text-sm text-muted-foreground">Date, dish, restaurant, and alert from confirmed choices.</p>
                        </div>
                        <Button type="button" size="icon" variant="ghost" className="h-10 w-10 rounded-xl" onClick={() => setShowHistory(false)}>
                          <X className="h-5 w-5" />
                        </Button>
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                        {historyLoading ? (
                          <div className="rounded-2xl border border-border/60 bg-card/55 p-4 text-sm text-muted-foreground">Loading history...</div>
                        ) : historyError ? (
                          <div className="rounded-2xl border border-health-rose/40 bg-health-rose/10 p-4 text-sm text-health-rose">{historyError}</div>
                        ) : (
                          <div className="space-y-3">
                            {historyFoodSummary?.latest_item ? (
                              <div className="rounded-2xl border border-border/60 bg-card/55 p-4">
                                <p className="text-xs text-muted-foreground">Latest food analysis</p>
                                <p className="mt-1 text-sm font-semibold">{historyFoodSummary.latest_item}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Alert: {historyFoodSummary.latest_alert ?? "N/A"} | {historyFoodSummary.latest_calories ?? 0} kcal | Sodium{" "}
                                  {historyFoodSummary.latest_sodium_mg ?? 0} mg
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">{historyFoodSummary.latest_note ?? "No note available."}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Green {historyFoodSummary.alert_counts?.green ?? 0} | Yellow {historyFoodSummary.alert_counts?.yellow ?? 0} | Red{" "}
                                  {historyFoodSummary.alert_counts?.red ?? 0} | Total {historyFoodSummary.recent_choices ?? 0}
                                </p>
                              </div>
                            ) : null}

                            {historyItems.length ? (
                              historyItems.map((item) => {
                                const alert = toAlertLevel(item.impact_label);
                                const meta = alertMeta[alert];
                                return (
                                  <div key={item.id} className="rounded-2xl border border-border/60 bg-card/55 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p className="text-sm font-semibold">{item.dish_name ?? "Dish not available"}</p>
                                      <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${meta.badgeClass}`}>{meta.label}</span>
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">{item.restaurant_name}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Risk alert: {meta.label}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="rounded-2xl border border-dashed border-border/70 bg-card/45 p-4 text-sm text-muted-foreground">
                                No confirmed food history yet.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.section>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
      <CameraCaptureModal
        open={showFoodCamera}
        title="Food Camera Scan"
        subtitle="Capture food image. It can read QR and visible photo text to detect dish hints before risk analysis."
        captureLabel="Scan & Analyze"
        processing={isFoodScanProcessing}
        onClose={() => setShowFoodCamera(false)}
        onCapture={handleFoodCameraScan}
      />
    </AppLayout>
  );
};

export default Food;
