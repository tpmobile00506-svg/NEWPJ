import { defineConfig, env } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  schema: './backend/prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
