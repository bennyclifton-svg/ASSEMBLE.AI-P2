import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /* ============================================
         COLORS - Extended with Precision Theme
         ============================================ */
      colors: {
        // Semantic colors (from CSS variables)
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',

        // Copper palette (Architectural Precision)
        copper: {
          DEFAULT: '#D4A574',
          50: '#FCF8F3',
          100: '#F5E6D3',
          200: '#E8C4A0',
          300: '#D4A574',
          400: '#C49464',
          500: '#B07D4F',
          600: '#8B7355',
          700: '#6B5A45',
          800: '#4A3F32',
          900: '#2A2520',
        },

        // Slate palette (Deep neutrals)
        slate: {
          850: '#1A1D21',
          925: '#141618',
          950: '#0F1115',
        },

        // Status colors (Earth tones for precision theme)
        status: {
          active: '#D4A574',
          complete: '#7A9E7E',
          review: '#E8B931',
          draft: '#6B7280',
        },
      },

      /* ============================================
         TYPOGRAPHY
         ============================================ */
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'DM Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['var(--font-spectral)', 'Spectral', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },

      fontSize: {
        'micro': ['10px', { lineHeight: '1.2' }],
        'tiny': ['11px', { lineHeight: '1.4' }],
        'xs': ['12px', { lineHeight: '1.4' }],
        'sm': ['13px', { lineHeight: '1.5' }],
        'base': ['14px', { lineHeight: '1.5' }],
        'md': ['15px', { lineHeight: '1.5' }],
        'lg': ['18px', { lineHeight: '1.4' }],
        'xl': ['20px', { lineHeight: '1.3' }],
        '2xl': ['24px', { lineHeight: '1.2' }],
      },

      letterSpacing: {
        'tighter': '-0.5px',
        'tight': '-0.3px',
        'normal': '0',
        'wide': '0.5px',
        'wider': '1px',
        'widest': '2px',
      },

      /* ============================================
         SPACING & SIZING
         ============================================ */
      spacing: {
        '4.5': '18px',
        '13': '52px',
        '15': '60px',
        '18': '72px',
      },

      /* ============================================
         BORDER RADIUS
         ============================================ */
      borderRadius: {
        'sm': '4px',
        DEFAULT: '6px',
        'md': '8px',
        'lg': '10px',
        'xl': '12px',
        '2xl': '14px',
        '3xl': '16px',
      },

      /* ============================================
         BOX SHADOWS - Including Precision Theme
         ============================================ */
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
        // Dark/Precision theme shadows
        'dark-sm': '0 1px 2px rgba(0, 0, 0, 0.4)',
        'dark': '0 2px 4px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)',
        'dark-md': '0 4px 8px rgba(0, 0, 0, 0.4)',
        'dark-lg': '0 8px 16px rgba(0, 0, 0, 0.5)',
        // Copper glow
        'glow-copper': '0 0 20px rgba(212, 165, 116, 0.15)',
        'glow-copper-md': '0 0 30px rgba(212, 165, 116, 0.2)',
      },

      /* ============================================
         BACKGROUNDS - Blueprint Grid
         ============================================ */
      backgroundImage: {
        'blueprint': `
          linear-gradient(rgba(212, 165, 116, 0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(212, 165, 116, 0.04) 1px, transparent 1px)
        `,
        'blueprint-dense': `
          linear-gradient(rgba(212, 165, 116, 0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(212, 165, 116, 0.06) 1px, transparent 1px)
        `,
        'gradient-copper': 'linear-gradient(135deg, #D4A574, #C49464)',
        'gradient-copper-light': 'linear-gradient(135deg, #E8C4A0, #D4A574)',
        'divider-gradient': 'linear-gradient(90deg, rgba(212, 165, 116, 0.4), transparent)',
      },

      backgroundSize: {
        'grid-32': '32px 32px',
        'grid-40': '40px 40px',
      },

      /* ============================================
         ANIMATIONS
         ============================================ */
      animation: {
        'slide-in-up': 'slideInUp 0.4s ease-out forwards',
        'slide-in-down': 'slideInDown 0.4s ease-out forwards',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'scale-in': 'scaleIn 0.2s ease-out forwards',
        'shimmer': 'shimmer 1.5s infinite',
        'progress': 'progress 1s ease-out forwards',
      },

      keyframes: {
        slideInUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInDown: {
          from: { opacity: '0', transform: 'translateY(-12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        progress: {
          from: { width: '0%' },
          to: { width: 'var(--progress-value)' },
        },
      },

      /* ============================================
         TRANSITIONS
         ============================================ */
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
        '400': '400ms',
      },

      transitionTimingFunction: {
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },

      /* ============================================
         Z-INDEX
         ============================================ */
      zIndex: {
        'behind': '-1',
        'base': '0',
        'elevated': '1',
        'dropdown': '10',
        'sticky': '20',
        'modal': '30',
        'popover': '40',
        'toast': '50',
      },
    },
  },

  plugins: [
    // Custom plugin for precision theme utilities
    function({ addUtilities, theme }: { addUtilities: Function; theme: Function }) {
      const precisionUtilities = {
        // Border accent utilities
        '.border-accent-copper': {
          borderColor: 'rgba(212, 165, 116, 0.25)',
        },
        '.border-accent-copper-strong': {
          borderColor: 'rgba(212, 165, 116, 0.4)',
        },

        // Background utilities
        '.bg-elevated': {
          backgroundColor: 'rgba(26, 29, 33, 0.7)',
        },
        '.bg-copper-tint': {
          backgroundColor: 'rgba(212, 165, 116, 0.12)',
        },
        '.bg-copper-subtle': {
          backgroundColor: 'rgba(212, 165, 116, 0.06)',
        },

        // Hover utilities
        '.hover-lift': {
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4)',
          },
        },
        '.hover-glow': {
          transition: 'box-shadow 0.2s ease',
          '&:hover': {
            boxShadow: '0 0 20px rgba(212, 165, 116, 0.15)',
          },
        },
        '.active-press': {
          '&:active': {
            transform: 'scale(0.98)',
          },
        },

        // Animation delay utilities
        '.animate-delay-100': { animationDelay: '100ms' },
        '.animate-delay-200': { animationDelay: '200ms' },
        '.animate-delay-300': { animationDelay: '300ms' },
        '.animate-delay-400': { animationDelay: '400ms' },
        '.animate-delay-500': { animationDelay: '500ms' },

        // Backdrop blur for cards
        '.backdrop-blur-card': {
          backdropFilter: 'blur(8px)',
        },
      };

      addUtilities(precisionUtilities);
    },
  ],
};

export default config;
