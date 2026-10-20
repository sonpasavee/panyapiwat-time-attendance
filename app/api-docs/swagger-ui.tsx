"use client";

import Script from "next/script";

declare global {
  interface Window {
    SwaggerUIBundle?: (options: {
      url: string;
      dom_id: string;
      withCredentials: boolean;
      persistAuthorization: boolean;
    }) => void;
  }
}

export function SwaggerUI() {
  function renderSwaggerUI() {
    window.SwaggerUIBundle?.({
      url: "/api/openapi",
      dom_id: "#swagger-ui",
      withCredentials: true,
      persistAuthorization: true,
    });
  }

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
      />
      <Script
        src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"
        strategy="afterInteractive"
        onLoad={renderSwaggerUI}
      />
      <main className="swagger-page">
        <header className="swagger-page__header">
          <h1>API Documentation</h1>
          <p>Interactive API reference for the time attendance system.</p>
        </header>
        <div id="swagger-ui" />
      </main>
    </>
  );
}
