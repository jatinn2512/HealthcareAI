# HealthcareAI

A comprehensive AI-powered healthcare platform that combines machine learning predictions with real-time health monitoring, nutrition planning, and doctor collaboration.

## Project Overview

HealthcareAI is a full-stack application designed to help users manage their health through:

- **AI-Powered Risk Assessment**: Machine learning models for predicting health risks related to asthma, diabetes, heart disease, hypertension, and obesity
- **Real-time Health Monitoring**: Track health metrics and air quality data with interactive visualizations
- **Nutrition Planning**: Get personalized nutrition recommendations and restaurant suggestions based on your health profile
- **Doctor Collaboration**: Connect with healthcare professionals and share health insights
- **Predictive Analytics**: Weekly health summaries and trend analysis based on collected data

## Technology Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MySQL
- **Authentication**: JWT-based security
- **Key Features**:
  - RESTful API for health data management
  - Authentication and role-based access control
  - Integration with multiple health monitoring sources
  - Lab report parsing and analysis
  - Risk assessment service

### Frontend
- **Framework**: React + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Features**:
  - Interactive health dashboards
  - Real-time data visualization
  - Camera capture for health metrics
  - Chat-based health assistant
  - Responsive design

### AI/ML
- **Models**: Python-based machine learning models
- **Algorithms**: Trained models for:
  - Asthma risk prediction
  - Diabetes prediction
  - Heart disease risk assessment
  - Hypertension detection
  - Obesity classification
- **Data Processing**: Weekly aggregations and user insights

## Project Structure

- **`backend/`** - FastAPI application with API routes, database models, services, and authentication
- **`frontend/`** - React TypeScript application with components and pages
- **`ai_ml/`** - Machine learning models, training scripts, and data processing
  - `models/` - Pre-trained ML models
  - `datasets/` - Training and demo data
  - `train/` - Model training scripts
  - `integration/` - Model integration utilities
  - `analytics/` - Data analytics and insights

## Features

### Health Risk Assessment
- ML-powered predictions for multiple health conditions
- Risk score calculation based on user profiles and health history
- Personalized health recommendations

### Monitoring & Analytics
- Air Quality Index (AQI) tracking
- Health metrics monitoring over time
- Weekly health summaries and trend analysis
- User behavior insights

### Nutrition & Lifestyle
- Personalized nutrition plans
- Restaurant recommendations aligned with health goals
- Dish nutrition information database

### Doctor Network
- Healthcare provider directory
- Doctor-patient collaboration tools
- Health information sharing

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- MySQL 8.0+

### Installation

1. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

3. **Database Configuration**
   - Configure MySQL connection in `backend/app/core/config.py`
   - Run migration scripts if available

### Running the Application

**Backend**:
```bash
cd backend
python -m uvicorn app.main:app --reload
```

**Frontend**:
```bash
cd frontend
npm run dev
```

## Data Sources

- **Demo Data**: `ai_ml/datasets/seed/` contains demo user profiles and nutrition data
- **Datasets**: Training datasets for asthma, diabetes, and heart disease models
- **Mock Data**: `backend/mock_data/` contains sample data for development

## API Endpoints

The backend provides REST API endpoints for:
- User authentication and profiles
- Health risk assessments
- Nutrition planning
- Doctor connections
- Health monitoring data
- Air quality information
- Restaurant recommendations

## Machine Learning Models

All models are stored in `ai_ml/models/` with separate directories for each condition:
- `asthma/` - Asthma risk prediction model
- `diabetes/` - Diabetes prediction model
- `heart/` - Heart disease risk model
- `hypertension/` - Hypertension detection model
- `obesity/` - Obesity classification model

## Contributing

To contribute to HealthcareAI, please follow the existing code structure and ensure all tests pass before submitting changes.

## Support

For issues, questions, or suggestions, please open an issue in the repository.

---

**Last Updated**: April 2026
