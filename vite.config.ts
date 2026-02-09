import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig, loadEnv } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const parsedPort = Number.parseInt(env.PORT ?? '', 10);
    const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3000;

    return {
        server: {
            port,
        },
        preview: {
            port,
        },
        plugins: [
            tailwindcss(),
            tsConfigPaths({
                projects: ['./tsconfig.json'],
            }),
            tanstackStart(),
            viteReact(),
        ],
    };
});
