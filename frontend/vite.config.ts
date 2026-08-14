import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const stylesDir = path.resolve(import.meta.dirname, 'src/styles')

export default defineConfig(({ command }) => ({
  plugins: [react()],

  resolve: {
    // tsconfig.app.json 의 paths 와 반드시 같이 유지할 것
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },

  css: {
    modules: {
      // 개발 중에는 DevTools 에서 어느 컴포넌트의 어떤 클래스인지 바로 보이게 하고,
      // 빌드 결과물에는 짧은 해시만 남긴다.
      generateScopedName: command === 'serve' ? '[folder]__[local]' : '[hash:base64:6]',
    },

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
}))
