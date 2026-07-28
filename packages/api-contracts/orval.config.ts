import { defineConfig } from 'orval';

export default defineConfig({
  nook: {
    input: {
      target: './openapi/nook-dev.openapi.json',
    },
    output: {
      baseUrl: '',
      clean: true,
      client: 'fetch',
      fileExtension: '.generated.ts',
      mode: 'single',
      override: {
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          path: '../../apps/web/src/shared/api/orval-mutator.ts',
          name: 'orvalMutator',
        },
      },
      schemas: '../../apps/web/src/shared/api/generated/models',
      target: '../../apps/web/src/shared/api/generated/endpoints.generated.ts',
    },
  },
});
