import { Plugin } from 'vite';

export function createAdminApiPlugin(): Plugin {
  return {
    name: 'admin-local-api',
    apply: 'serve',
  };
}