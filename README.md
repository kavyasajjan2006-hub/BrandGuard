# BrandGuard

**BrandGuard is a brand compliance platform that helps teams maintain consistent brand communication through rule-based content reviews.**

The platform allows users to manage company-specific brand kits, review content against configured brand guidelines, identify compliance issues, view recommendations, and manage saved review results.

## Features

### 1. User Authentication
- Login and registration interface.
- JWT-based authentication support.
- Token storage for authenticated application access.

### 2. Brand Kit Management
- Create and manage brand-specific configurations.
- Define company information and tone of voice.
- Store brand guidelines, approved facts, and terminology rules.
- Use brand information as the basis for content compliance reviews.

### 3. Content Compliance Reviews
- Submit content for review.
- Evaluate content against configured brand rules.
- Display a compliance score and risk level.
- Identify potential brand compliance issues.
- Present findings and recommendations for improving content.

### 4. Findings and Recommendations
- View findings generated during content reviews.
- Edit recommendations where supported.
- Save recommendation changes.
- Manage finding statuses, including Open, Resolved, and Accepted.

### 5. Saved Review Results
- Store content review results in the backend database.
- Retrieve previously saved reviews.
- Revisit findings and recommendations.

### 6. PDF Export
- Export review information as a PDF for documentation and sharing.

### 7. Web Interface
- React-based user interface.
- Vite development and production build tooling.
- Interactive forms and review controls.
- Organized views for managing brand kits and content reviews.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React |
| Build tool | Vite |
| Backend runtime | Node.js |
| Backend framework | Express.js |
| Database | MongoDB |
| Authentication | JSON Web Tokens (JWT) |
| Icons | Lucide React |
| Version control | Git and GitHub |
| Frontend deployment | Cloudflare, subject to deployment configuration |

## System Architecture

BrandGuard uses a frontend–backend architecture.

```text
                    User
                      |
                      v
             React + Vite Frontend
                      |
                      v
             Express.js REST API
                      |
           +----------+----------+
           |          |          |
           v          v          v
       Brand Kits  Reviews   Authentication
           |          |
           +-----+----+
                 |
                 v
               MongoDB
```

### Architecture Components

- **Frontend:** Provides the user interface for authentication, brand kit management, content reviews, findings, and report export.
- **Backend:** Handles API requests, validation, review processing, and data operations.
- **Database:** MongoDB stores application records, including brand kits and review results.
- **Authentication:** JWT supports authenticated access where configured.
- **Review workflow:** Submitted content is evaluated against configured brand rules, and the resulting scores, findings, and recommendations are presented to the user.

## Getting Started

### Prerequisites

Install the following:

- Node.js and npm
- Git
- Visual Studio Code or another code editor
- Access to the configured MongoDB database

### 1. Clone the Repository

```bash
git clone https://github.com/kavyasajjan2006-hub/BrandGuard.git
cd BrandGuard
```

### 2. Install Frontend Dependencies

If the frontend is located in the `frontend` directory:

```bash
cd frontend
npm install
```

### 3. Install Backend Dependencies

Open a separate terminal and navigate to the backend directory:

```bash
cd path/to/backend
npm install
```

Replace `path/to/backend` with the actual backend folder path in the repository.

## Environment Configuration

Configure the environment variables required by the backend in its `.env` file.

Typical variables may include:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

Use the exact variable names expected by the current backend code. Do not commit actual database credentials or authentication secrets to GitHub.

Add `.env` to `.gitignore` and provide an `.env.example` file containing placeholder values if one is not already present.

## Running the Application

### Start the Backend

Navigate to the backend directory and use the start script defined in its `package.json`. For example:

```bash
npm run dev
```

If the project does not define a `dev` script, use its configured start command instead.

### Start the Frontend

Open another terminal:

```bash
cd frontend
npm run dev
```

Vite will display the local URL in the terminal.

### Build for Production

From the frontend directory:

```bash
npm run build
```

This creates the production build in the `dist` directory.

## API Overview

The backend provides API functionality for brand kit management, content reviews, and authentication.

The exact routes and request formats should be taken from the current backend source code. Refer to the implementation for the complete API contract.

## Testing and Verification

Before submitting the project, verify the following:

- The frontend builds successfully.
- Login and registration work with the configured backend.
- Brand kits can be created and retrieved.
- Content can be submitted for review.
- Review scores, risk levels, findings, and recommendations appear correctly.
- Recommendation edits and finding status changes are saved where supported.
- Previously saved reviews can be retrieved.
- PDF export produces a readable report.
- The deployed application communicates with the deployed backend and database.
- Invalid inputs and failed API requests are handled appropriately.

Only mark tests as passed after verifying them in the current version.

## Future Development Roadmap

The following are **proposed improvements**, not claims about features already implemented.

### 1. More Advanced Compliance Analysis
Improve rule-based checks to recognize contextual meaning, ambiguous language, and more complex brand guideline violations.

### 2. Expanded File Support
Explore reviewing uploaded documents and additional content formats, with suitable file validation and security controls.

### 3. Compliance Analytics
Introduce dashboards showing recurring violations, compliance trends, and changes in review scores over time.

### 4. Collaboration and Audit History
Explore role-based permissions, review history, and audit trails for teams working together on brand approvals.

### 5. Automated Testing and Reliability
Expand automated tests for API endpoints, authentication, data persistence, and the complete review workflow.

## Project Links

- **GitHub Repository:** https://github.com/kavyasajjan2006-hub/BrandGuard
- **Deployed Application:** https://brandguard-hub.kavyasajjan2006.workers.dev/


**BrandGuard — helping teams maintain consistent, guideline-aligned brand communication.**
