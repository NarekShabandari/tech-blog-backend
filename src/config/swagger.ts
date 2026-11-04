import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Blog API",
      version: "1.0.0",
      description: "REST API for blog with AI post generation",
    },
    servers: [
      {
        url: "http://localhost:3001",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            username: { type: "string" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Post: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string" },
            slug: { type: "string" },
            content: { type: "string" },
            published: { type: "boolean" },
            tags: { type: "array", items: { type: "string" } },
            author: { type: "string" },
            author_id: { type: "string", format: "uuid" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
