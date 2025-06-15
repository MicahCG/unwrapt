import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		colors: {
			// Override default Tailwind colors to prevent conflicts
			transparent: 'transparent',
			current: 'currentColor',
			white: '#ffffff',
			black: '#000000',
			
			// CSS variables for shadcn/ui compatibility
			border: 'hsl(var(--border))',
			input: 'hsl(var(--input))',
			ring: 'hsl(var(--ring))',
			background: 'hsl(var(--background))',
			foreground: 'hsl(var(--foreground))',
			
			primary: {
				DEFAULT: '#4A4A4A', // Dark charcoal from the logo
				foreground: '#F5F2ED' // Light cream
			},
			secondary: {
				DEFAULT: '#F5F2ED', // Light cream background
				foreground: '#4A4A4A' // Dark charcoal text
			},
			destructive: {
				DEFAULT: 'hsl(var(--destructive))',
				foreground: 'hsl(var(--destructive-foreground))'
			},
			muted: {
				DEFAULT: '#F8F6F1', // Slightly darker cream
				foreground: '#6B6B6B' // Medium gray
			},
			accent: {
				DEFAULT: '#F5F2ED', // Updated to match light brown/tan
				foreground: '#4A4A4A'
			},
			popover: {
				DEFAULT: 'hsl(var(--popover))',
				foreground: 'hsl(var(--popover-foreground))'
			},
			card: {
				DEFAULT: '#FFFFFF', // Pure white for cards
				foreground: '#4A4A4A'
			},
			sidebar: {
				DEFAULT: 'hsl(var(--sidebar-background))',
				foreground: 'hsl(var(--sidebar-foreground))',
				primary: 'hsl(var(--sidebar-primary))',
				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
				accent: 'hsl(var(--sidebar-accent))',
				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
				border: 'hsl(var(--sidebar-border))',
				ring: 'hsl(var(--sidebar-ring))'
			},
			
			// Brand specific colors - these will override any default Tailwind colors
			brand: {
				charcoal: '#4A4A4A',
				cream: '#F5F2ED',
				'cream-light': '#F8F6F1',
				gold: '#F5F2ED' // Changed to match the light brown/tan
			},
			
			// Override ALL color ranges that might conflict
			slate: {
				50: '#F8F6F1',
				100: '#F5F2ED',
				200: '#E5E0D8',
				300: '#D0C8BD',
				400: '#A8A8A8',
				500: '#6B6B6B',
				600: '#4A4A4A',
				700: '#3A3A3A',
				800: '#2A2A2A',
				900: '#1A1A1A',
				950: '#0F0F0F'
			},
			gray: {
				50: '#F8F6F1',
				100: '#F5F2ED',
				200: '#E5E0D8',
				300: '#D0C8BD',
				400: '#A8A8A8',
				500: '#6B6B6B',
				600: '#4A4A4A',
				700: '#3A3A3A',
				800: '#2A2A2A',
				900: '#1A1A1A',
				950: '#0F0F0F'
			},
			zinc: {
				50: '#F8F6F1',
				100: '#F5F2ED',
				200: '#E5E0D8',
				300: '#D0C8BD',
				400: '#A8A8A8',
				500: '#6B6B6B',
				600: '#4A4A4A',
				700: '#3A3A3A',
				800: '#2A2A2A',
				900: '#1A1A1A',
				950: '#0F0F0F'
			},
			neutral: {
				50: '#F8F6F1',
				100: '#F5F2ED',
				200: '#E5E0D8',
				300: '#D0C8BD',
				400: '#A8A8A8',
				500: '#6B6B6B',
				600: '#4A4A4A',
				700: '#3A3A3A',
				800: '#2A2A2A',
				900: '#1A1A1A',
				950: '#0F0F0F'
			},
			stone: {
				50: '#F8F6F1',
				100: '#F5F2ED',
				200: '#E5E0D8',
				300: '#D0C8BD',
				400: '#A8A8A8',
				500: '#6B6B6B',
				600: '#4A4A4A',
				700: '#3A3A3A',
				800: '#2A2A2A',
				900: '#1A1A1A',
				950: '#0F0F0F'
			},
			red: {
				50: '#F8F6F1',
				100: '#F5F2ED',
				200: '#E5E0D8',
				300: '#D0C8BD',
				400: '#A8A8A8',
				500: '#6B6B6B',
				600: '#4A4A4A',
				700: '#3A3A3A',
				800: '#2A2A2A',
				900: '#1A1A1A',
				950: '#0F0F0F'
			},
			orange: {
				50: '#F8F6F1',
				100: '#F5F2ED',
				200: '#E5E0D8',
				300: '#D0C8BD',
				400: '#A8A8A8',
				500: '#6B6B6B',
				600: '#4A4A4A',
				700: '#3A3A3A',
				800: '#2A2A2A',
				900: '#1A1A1A',
				950: '#0F0F0F'
			},
			amber: {
				50: '#F8F6F1',
				100: '#F5F2ED',
				200: '#E5E0D8',
				300: '#D0C8BD',
				400: '#F5F2ED', // Use light brown/tan here
				500: '#F5F2ED',
				600: '#E6C547',
				700: '#B8A032',
				800: '#9A8629',
				900: '#7D6D20',
				950: '#5F5318'
			},
			yellow: {
				50: '#F8F6F1',
				100: '#F5F2ED',
				200: '#E5E0D8',
				300: '#D0C8BD',
				400: '#F5F2ED',
				500: '#F5F2ED',
				600: '#E6C547',
				700: '#B8A032',
				800: '#9A8629',
				900: '#7D6D20',
				950: '#5F5318'
			},
			lime: {
				50: '#000000',
				100: '#000000',
				200: '#000000',
				300: '#000000',
				400: '#000000',
				500: '#000000', // Bold black instead of lime
				600: '#000000',
				700: '#000000',
				800: '#000000',
				900: '#000000',
				950: '#000000'
			},
			green: {
				50: '#000000',
				100: '#000000',
				200: '#000000',
				300: '#000000',
				400: '#000000',
				500: '#000000', // Bold black instead of green
				600: '#000000',
				700: '#000000',
				800: '#000000',
				900: '#000000',
				950: '#000000'
			},
			emerald: {
				50: '#F8F6F1',
				100: '#F5F2ED',
				200: '#E5E0D8',
				300: '#D0C8BD',
				400: '#A8A8A8',
				500: '#000000',
				600: '#3A3A3A',
				700: '#2A2A2A',
				800: '#1A1A1A',
				900: '#0F0F0F',
				950: '#050505'
			},
			teal: {
				50: '#F8F6F1',
				100: '#F5F2ED',
				200: '#E5E0D8',
				300: '#D0C8BD',
				400: '#A8A8A8',
				500: '#000000',
				600: '#3A3A3A',
				700: '#2A2A2A',
				800: '#1A1A1A',
				900: '#0F0F0F',
				950: '#050505'
			},
			cyan: {
				50: '#F8F6F1',
				100: '#F5F2ED',
				200: '#E5E0D8',
				300: '#D0C8BD',
				400: '#A8A8A8',
				500: '#000000',
				600: '#3A3A3A',
				700: '#2A2A2A',
				800: '#1A1A1A',
				900: '#0F0F0F',
				950: '#050505'
			},
			sky: {
				50: '#F8F6F1',
				100: '#F5F2ED',
				200: '#E5E0D8',
				300: '#D0C8BD',
				400: '#A8A8A8',
				500: '#000000',
				600: '#3A3A3A',
				700: '#2A2A2A',
				800: '#1A1A1A',
				900: '#0F0F0F',
				950: '#050505'
			},
			blue: {
				50: '#F8F6F1',
				100: '#F5F2ED',
				200: '#E5E0D8',
				300: '#D0C8BD',
				400: '#A8A8A8',
				500: '#000000',
				600: '#3A3A3A',
				700: '#2A2A2A',
				800: '#1A1A1A',
				900: '#0F0F0F',
				950: '#050505'
			},
			indigo: {
				50: '#F8F6F1',
				100: '#F5F2ED',
				200: '#E5E0D8',
				300: '#D0C8BD',
				400: '#A8A8A8',
				500: '#000000',
				600: '#3A3A3A',
				700: '#2A2A2A',
				800: '#1A1A1A',
				900: '#0F0F0F',
				950: '#050505'
			},
			violet: {
				50: '#F8F6F1',
				100: '#F5F2ED',
				200: '#E5E0D8',
				300: '#D0C8BD',
				400: '#A8A8A8',
				500: '#000000',
				600: '#3A3A3A',
				700: '#2A2A2A',
				800: '#1A1A1A',
				900: '#0F0F0F',
				950: '#050505'
			},
			purple: {
				50: '#F8F6F1',
				100: '#F5F2ED',
				200: '#E5E0D8',
				300: '#D0C8BD',
				400: '#A8A8A8',
				500: '#000000',
				600: '#3A3A3A',
				700: '#2A2A2A',
				800: '#1A1A1A',
				900: '#0F0F0F',
				950: '#050505'
			},
			fuchsia: {
				50: '#F8F6F1',
				100: '#F5F2ED',
				200: '#E5E0D8',
				300: '#D0C8BD',
				400: '#A8A8A8',
				500: '#000000',
				600: '#3A3A3A',
				700: '#2A2A2A',
				800: '#1A1A1A',
				900: '#0F0F0F',
				950: '#050505'
			},
			pink: {
				50: '#F8F6F1',
				100: '#F5F2ED',
				200: '#E5E0D8',
				300: '#D0C8BD',
				400: '#A8A8A8',
				500: '#000000',
				600: '#3A3A3A',
				700: '#2A2A2A',
				800: '#1A1A1A',
				900: '#0F0F0F',
				950: '#050505'
			},
			rose: {
				50: '#F8F6F1',
				100: '#F5F2ED',
				200: '#E5E0D8',
				300: '#D0C8BD',
				400: '#A8A8A8',
				500: '#000000',
				600: '#3A3A3A',
				700: '#2A2A2A',
				800: '#1A1A1A',
				900: '#0F0F0F',
				950: '#050505'
			}
		},
		// ... keep existing code (extend section)
		extend: {
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
