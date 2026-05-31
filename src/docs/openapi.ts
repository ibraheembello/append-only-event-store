/**
 * OpenAPI 3 spec for the event store. Hand-written (no build step) and served
 * by swagger-ui-express at /docs. This is a documentation/testing layer only —
 * it does not change any storage behaviour.
 */
export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Append-Only Event Store',
    version: '1.0.0',
    description:
      'A key-value store on top of an append-only log with an in-memory byte-offset index.',
  },
  servers: [{ url: '/' }],
  paths: {
    '/events': {
      post: {
        summary: 'Store an event',
        description:
          'Takes any JSON body, stamps it with a UUID v4 id and an ISO createdAt, appends it to events.log, and returns the full event.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', additionalProperties: true },
              examples: {
                like: {
                  summary: 'A like event',
                  value: { type: 'like', postId: 'p_123', likerName: 'Chidi' },
                },
                unicode: {
                  summary: 'An event with unicode',
                  value: { type: 'note', text: '🚀 café 日本語' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created — returns the full stored event',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  additionalProperties: true,
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/events/{id}': {
      get: {
        summary: 'Read an event by id',
        description:
          'Looks the id up in the in-memory index and seeks directly to its byte range in the log. Does not scan the file.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'The event id returned by POST /events',
          },
        ],
        responses: {
          '200': {
            description: 'The stored event',
            content: {
              'application/json': {
                schema: { type: 'object', additionalProperties: true },
              },
            },
          },
          '404': {
            description: 'No event with that id is in the index',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { error: { type: 'string', example: 'Event not found' } },
                },
              },
            },
          },
        },
      },
    },
    '/stats': {
      get: {
        summary: 'Store statistics',
        description: 'Returns the number of indexed events and the total bytes in the log.',
        responses: {
          '200': {
            description: 'Stats',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    total: { type: 'integer', example: 3 },
                    bytes: { type: 'integer', example: 358 },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
