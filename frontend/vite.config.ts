import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const stylesDir = path.resolve(import.meta.dirname, 'src/styles')

export default defineConfig({
  plugins: [react()],

  resolve: {
    // tsconfig.app.json 의 paths 와 반드시 같이 유지할 것
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },

  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: [stylesDir],

        // 모든 .scss 에 변수/믹스인을 자동 주입해 @use 를 매번 쓰지 않아도 되게 한다.
        //
        // 주의: additionalData 는 파티션 자신(_variables.scss 등)에도 주입되어
        // 모듈 순환 오류를 낸다. 그래서 함수 형태로 파티션을 걸러낸다.
        additionalData: (source: string, filename: string) => {
          const isPartial = path.dirname(filename) === stylesDir
          return isPartial ? source : `@use "variables" as *;\n@use "mixins" as *;\n${source}`
        },
      },
    },
  },
})
