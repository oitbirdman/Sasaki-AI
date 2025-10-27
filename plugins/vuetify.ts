import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

export default defineNuxtPlugin((nuxtApp) => {
  const vuetify = createVuetify({
    components,
    directives,
    theme: {
      defaultTheme: 'dark',
      themes: {
        dark: {
          dark: true,
          colors: {
            background: '#1e1e1e',
            surface: '#2d2d2d',
            primary: '#8ab4f8',
            secondary: '#c58af9',
            error: '#f28b82',
            info: '#78d9ec',
            success: '#81c995',
            warning: '#fdd663',
          }
        }
      }
    }
  })

  nuxtApp.vueApp.use(vuetify)
})
