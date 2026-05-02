import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AppIconOpenWriter } from '@/components/app/icons/AppIconOpenWriter';
const SplashPage = () => {
    return (_jsxs("div", { className: "flex items-center justify-center h-screen w-screen bg-gradient-to-br from-background via-background to-background/95", children: [_jsx("div", { className: "animate-fade-in animate-bounce-slow", children: _jsx(AppIconOpenWriter, { className: "w-48 h-48" }) }), _jsx("style", { children: `
				@keyframes fade-in {
					from {
						opacity: 0;
					}
					to {
						opacity: 1;
					}
				}

				@keyframes bounce-slow {
					0%, 100% {
						transform: translateY(0);
					}
					50% {
						transform: translateY(-12px);
					}
				}

				.animate-fade-in {
					animation: fade-in 0.6s ease-in-out;
				}

				.animate-bounce-slow {
					animation: bounce-slow 2s infinite;
				}
			` })] }));
};
export default SplashPage;
