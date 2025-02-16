import type { ConfigDefinition } from 'figue';
import { defineConfig } from 'figue';
import { z } from 'zod';

export const configDefinition = {
  env: {
    doc: 'The application environment.',
    schema: z.enum(['development', 'production', 'test']),
    default: 'development',
    env: 'NODE_ENV',
  },
  server: {
    port: {
      doc: 'The port to listen on when using node server',
      schema: z.coerce.number().min(1024).max(65535),
      default: 8787,
      env: 'PORT',
    },
    routeTimeoutMs: {
      doc: 'The maximum time in milliseconds for a route to complete before timing out',
      schema: z.coerce.number().int().positive(),
      default: 5_000,
      env: 'SERVER_API_ROUTES_TIMEOUT_MS',
    },
    corsOrigins: {
      doc: 'The CORS origin for the api server',
      schema: z.union([
        z.string(),
        z.array(z.string()),
      ]).transform(value => (typeof value === 'string' ? value.split(',') : value)),
      default: [],
      env: 'SERVER_CORS_ORIGINS',
    },
  },
  notes: {
    maxEncryptedPayloadLength: {
      doc: 'The maximum length of the encrypted payload of a note allowed by the api',
      schema: z.coerce.number().int().positive().min(1),
      default: 1024 * 1024 * 50, // 50MB
      env: 'NOTES_MAX_ENCRYPTED_PAYLOAD_LENGTH',
    },
  },
  tasks: {
    deleteExpiredNotes: {
      isEnabled: {
        doc: 'Whether to enable a periodic task to delete expired notes (not available for cloudflare)',
        schema: z
          .string()
          .trim()
          .toLowerCase()
          .transform(x => x === 'true')
          .pipe(z.boolean()),
        default: 'true',
        env: 'TASK_DELETE_EXPIRED_NOTES_ENABLED',
      },
      cron: {
        doc: 'The frequency with which to run the task to delete expired notes (cron syntax)',
        schema: z.string(),
        default: '0 * * * *', // Every hour
        env: 'TASK_DELETE_EXPIRED_NOTES_CRON',
      },
      runOnStartup: {
        doc: 'Whether the task to delete expired notes should run on startup',
        schema: z
          .string()
          .trim()
          .toLowerCase()
          .transform(x => x === 'true')
          .pipe(z.boolean()),
        default: 'true',
        env: 'TASK_DELETE_EXPIRED_NOTES_RUN_ON_STARTUP',
      },
    },
  },
  storage: {
    driverConfig: {
      fsLite: {
        path: {
          doc: 'The path to the directory where the data will be stored (only in node env)',
          schema: z.string(),
          default: './.data',
          env: 'STORAGE_DRIVER_FS_LITE_PATH',
        },
      },
      cloudflareKVBinding: {
        bindingName: {
          doc: 'The name of the Cloudflare KV binding to use (only in cloudflare env)',
          schema: z.string(),
          default: 'notes',
          env: 'STORAGE_DRIVER_CLOUDFLARE_KV_BINDING',
        },
      },
    },
  },
  public: {
    isAuthenticationRequired: {
      doc: 'Whether to require authentication to access the public api',
      schema: z
        .string()
        .trim()
        .toLowerCase()
        .transform(x => x === 'true')
        .pipe(z.boolean()),
      default: 'false',
      env: 'PUBLIC_IS_AUTHENTICATION_REQUIRED',
    },
  },
  authentication: {
    jwtSecret: {
      doc: 'The secret used to sign the JWT tokens',
      schema: z.string(),
      default: 'change-me',
      env: 'AUTHENTICATION_JWT_SECRET',
    },
    jwtDurationSeconds: {
      doc: 'The duration in seconds for which the JWT token is valid',
      schema: z.coerce.number().int().positive(),
      default: 60 * 60 * 24 * 7, // 1 week
      env: 'AUTHENTICATION_JWT_DURATION_SECONDS',
    },
    authUsers: {
      doc: 'The list of users allowed to authenticate. Comma-separated list of email and bcrypt password hash, like: `email1:passwordHash1,email2:passwordHash2`. Easily generate the value for this env variable here: https://docs.enclosed.cc/self-hosting/users-authentication-key-generator',
      schema: z
        .string()
        .transform((value) => {
          if (!value) {
            return [];
          }

          return value
            .split(',')
            .map((user) => {
              const [email, passwordHash] = user.split(':');
              return { email, passwordHash };
            });
        })
        .refine(
          (value) => {
            const result = z.array(z.object({
              email: z.string().email(),
              passwordHash: z.string(),
            })).safeParse(value);

            return result.success;
          },
          {
            message: 'AUTHENTICATION_USERS: Invalid format. Must be a comma-separated list of email:passwordHash',
          },
        ),
      default: '',
      env: 'AUTHENTICATION_USERS',
    },
  },
} as const satisfies ConfigDefinition;

export function getConfig({ env }: { env?: Record<string, string | undefined> } = {}) {
  const { config } = defineConfig(
    configDefinition,
    { envSource: env },
  );

  return config;
}
