flowchart TD
    A[User Login] --> B[Dashboard]
    B --> C[AI Chat]
    C --> D[Enter Chat Message]
    D --> E[Server Action Chat]
    E --> F[AI Model Request]
    F --> G[AI Response Streaming]
    G --> C
    B --> H[Image Generation]
    H --> I[Enter Image Prompt]
    I --> J[Server Action Image]
    J --> K[Image API Response]
    K --> B
    B --> L[Web Scraping]
    L --> M[Enter Scrape Query]
    M --> N[Server Action Scraper]
    N --> O[Scraper API Response]
    O --> B
    E --> P[Log Usage Analytics]
    J --> P
    N --> P
    P --> B