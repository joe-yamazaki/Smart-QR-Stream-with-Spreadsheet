import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Vercel等の環境変数をロード
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    // process.env.API_KEY をコード内で使えるように置換定義
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})