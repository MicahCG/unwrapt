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
				DEFAULT: '#2A2520', // Agent-first ink/charcoal
				foreground: '#F4ECDD' // Warm cream
			},
			secondary: {
				DEFAULT: '#F3ECDD', // Subtle chip cream
				foreground: '#2A2520' // Ink text
			},
			destructive: {
				DEFAULT: 'hsl(var(--destructive))',
				foreground: 'hsl(var(--destructive-foreground))'
			},
			muted: {
				DEFAULT: '#FAF6EE', // Card / elevated surface
				foreground: '#9A8E7C' // Muted warm gray
			},
			accent: {
				DEFAULT: '#B65B3C', // Terracotta accent
				foreground: '#FBF6EC'
			},
			popover: {
				DEFAULT: 'hsl(var(--popover))',
				foreground: 'hsl(var(--popover-foreground))'
			},
			card: {
				DEFAULT: '#FAF6EE', // Warm card surface
				foreground: '#2A2520'
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
			
			// Brand specific colors - agent-first 2.0 palette
			brand: {
				charcoal: '#2A2520',      // Ink / primary text & buttons
				ink: '#2A2520',
				cream: '#EDE6D8',         // App background
				'cream-light': '#FAF6EE', // Card / elevated surface
				surface: '#FAF6EE',       // Card surface (alias)
				chip: '#F3ECDD',          // Subtle chip / pill background
				accent: '#B65B3C',        // Terracotta accent
				'accent-soft': '#FBEFE5', // Soft terracotta wash
				sage: '#6E7B5B',          // Success / in-motion green
				'sage-soft': '#EEF0E4',   // Soft sage wash
				slate: '#5E6B72',         // Cool slate (alt avatar)
				secondary: '#6B6256',     // Secondary body text
				muted: '#9A8E7C',         // Muted label text
				subtle: '#837868',        // Subtle text
				buttonText: '#F4ECDD',    // Text on dark buttons
				gold: '#B79E7C',          // Warm tan (was golden beige)
				peach: '#FBEFE5',         // Soft peach wash
				blush: '#F3ECDD',         // Soft blush -> chip cream
				beige: '#E0D5BD'          // Golden beige
			},
			
			// Override ALL color ranges that might conflict
			slate: {
				50: '#FAF6EE',
				100: '#EDE6D8',
				200: '#E4DCD2',
				300: '#D8CDBB',
				400: '#A8A8A8',
				500: '#6B6B6B',
				600: '#2A2520',
				700: '#3A332B',
				800: '#2A2520',
				900: '#1A1A1A',
				950: '#0F0F0F'
			},
			gray: {
				50: '#FAF6EE',
				100: '#EDE6D8',
				200: '#E4DCD2',
				300: '#D8CDBB',
				400: '#A8A8A8',
				500: '#6B6B6B',
				600: '#2A2520',
				700: '#3A332B',
				800: '#2A2520',
				900: '#1A1A1A',
				950: '#0F0F0F'
			},
			zinc: {
				50: '#FAF6EE',
				100: '#EDE6D8',
				200: '#E4DCD2',
				300: '#D8CDBB',
				400: '#A8A8A8',
				500: '#6B6B6B',
				600: '#2A2520',
				700: '#3A332B',
				800: '#2A2520',
				900: '#1A1A1A',
				950: '#0F0F0F'
			},
			neutral: {
				50: '#FAF6EE',
				100: '#EDE6D8',
				200: '#E4DCD2',
				300: '#D8CDBB',
				400: '#A8A8A8',
				500: '#6B6B6B',
				600: '#2A2520',
				700: '#3A332B',
				800: '#2A2520',
				900: '#1A1A1A',
				950: '#0F0F0F'
			},
			stone: {
				50: '#FAF6EE',
				100: '#EDE6D8',
				200: '#E4DCD2',
				300: '#D8CDBB',
				400: '#A8A8A8',
				500: '#6B6B6B',
				600: '#2A2520',
				700: '#3A332B',
				800: '#2A2520',
				900: '#1A1A1A',
				950: '#0F0F0F'
			},
			red: {
				50: '#FAF6EE',
				100: '#EDE6D8',
				200: '#E4DCD2',
				300: '#D8CDBB',
				400: '#A8A8A8',
				500: '#6B6B6B',
				600: '#2A2520',
				700: '#3A332B',
				800: '#2A2520',
				900: '#1A1A1A',
				950: '#0F0F0F'
			},
			orange: {
				50: '#FAF6EE',
				100: '#EDE6D8',
				200: '#E4DCD2',
				300: '#D8CDBB',
				400: '#A8A8A8',
				500: '#6B6B6B',
				600: '#2A2520',
				700: '#3A332B',
				800: '#2A2520',
				900: '#1A1A1A',
				950: '#0F0F0F'
			},
			amber: {
				50: '#FAF6EE',
				100: '#EDE6D8',
				200: '#E4DCD2',
				300: '#D8CDBB',
				400: '#EDE6D8', // Use light brown/tan here
				500: '#EDE6D8',
				600: '#E6C547',
				700: '#B8A032',
				800: '#9A8629',
				900: '#7D6D20',
				950: '#5F5318'
			},
			yellow: {
				50: '#FAF6EE',
				100: '#EDE6D8',
				200: '#E4DCD2',
				300: '#D8CDBB',
				400: '#EDE6D8',
				500: '#EDE6D8',
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
				50: '#FAF6EE',
				100: '#EDE6D8',
				200: '#E4DCD2',
				300: '#D8CDBB',
				400: '#A8A8A8',
				500: '#000000',
				600: '#3A332B',
				700: '#2A2520',
				800: '#1A1A1A',
				900: '#0F0F0F',
				950: '#050505'
			},
			teal: {
				50: '#FAF6EE',
				100: '#EDE6D8',
				200: '#E4DCD2',
				300: '#D8CDBB',
				400: '#A8A8A8',
				500: '#000000',
				600: '#3A332B',
				700: '#2A2520',
				800: '#1A1A1A',
				900: '#0F0F0F',
				950: '#050505'
			},
			cyan: {
				50: '#FAF6EE',
				100: '#EDE6D8',
				200: '#E4DCD2',
				300: '#D8CDBB',
				400: '#A8A8A8',
				500: '#000000',
				600: '#3A332B',
				700: '#2A2520',
				800: '#1A1A1A',
				900: '#0F0F0F',
				950: '#050505'
			},
			sky: {
				50: '#FAF6EE',
				100: '#EDE6D8',
				200: '#E4DCD2',
				300: '#D8CDBB',
				400: '#A8A8A8',
				500: '#000000',
				600: '#3A332B',
				700: '#2A2520',
				800: '#1A1A1A',
				900: '#0F0F0F',
				950: '#050505'
			},
			blue: {
				50: '#FAF6EE',
				100: '#EDE6D8',
				200: '#E4DCD2',
				300: '#D8CDBB',
				400: '#A8A8A8',
				500: '#000000',
				600: '#3A332B',
				700: '#2A2520',
				800: '#1A1A1A',
				900: '#0F0F0F',
				950: '#050505'
			},
			indigo: {
				50: '#FAF6EE',
				100: '#EDE6D8',
				200: '#E4DCD2',
				300: '#D8CDBB',
				400: '#A8A8A8',
				500: '#000000',
				600: '#3A332B',
				700: '#2A2520',
				800: '#1A1A1A',
				900: '#0F0F0F',
				950: '#050505'
			},
			violet: {
				50: '#FAF6EE',
				100: '#EDE6D8',
				200: '#E4DCD2',
				300: '#D8CDBB',
				400: '#A8A8A8',
				500: '#000000',
				600: '#3A332B',
				700: '#2A2520',
				800: '#1A1A1A',
				900: '#0F0F0F',
				950: '#050505'
			},
			purple: {
				50: '#FAF6EE',
				100: '#EDE6D8',
				200: '#E4DCD2',
				300: '#D8CDBB',
				400: '#A8A8A8',
				500: '#000000',
				600: '#3A332B',
				700: '#2A2520',
				800: '#1A1A1A',
				900: '#0F0F0F',
				950: '#050505'
			},
			fuchsia: {
				50: '#FAF6EE',
				100: '#EDE6D8',
				200: '#E4DCD2',
				300: '#D8CDBB',
				400: '#A8A8A8',
				500: '#000000',
				600: '#3A332B',
				700: '#2A2520',
				800: '#1A1A1A',
				900: '#0F0F0F',
				950: '#050505'
			},
			pink: {
				50: '#FAF6EE',
				100: '#EDE6D8',
				200: '#E4DCD2',
				300: '#D8CDBB',
				400: '#A8A8A8',
				500: '#000000',
				600: '#3A332B',
				700: '#2A2520',
				800: '#1A1A1A',
				900: '#0F0F0F',
				950: '#050505'
			},
			rose: {
				50: '#FAF6EE',
				100: '#EDE6D8',
				200: '#E4DCD2',
				300: '#D8CDBB',
				400: '#A8A8A8',
				500: '#000000',
				600: '#3A332B',
				700: '#2A2520',
				800: '#1A1A1A',
				900: '#0F0F0F',
				950: '#050505'
			}
		},
		// ... keep existing code (extend section)
		extend: {
			fontFamily: {
				'display': ['"Newsreader"', 'Georgia', 'serif'],
				'serif': ['"Newsreader"', 'Georgia', 'serif'],
				'sans': ['"Hanken Grotesk"', '"Inter"', 'system-ui', 'sans-serif'],
				'mono': ['"DM Mono"', 'ui-monospace', 'monospace'],
			},
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
