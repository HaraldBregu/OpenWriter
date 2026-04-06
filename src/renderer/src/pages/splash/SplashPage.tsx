import React from 'react';
import { AppIconOpenWriter } from '@/components/app/icons/AppIconOpenWriter';

const SplashPage: React.FC = () => {

	return (
		<div className="flex items-center justify-center h-screen w-screen bg-gradient-to-br from-background via-background to-background/95">
			<div className="animate-fade-in">
				<div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-foreground/10 to-foreground/5 border border-foreground/10 flex items-center justify-center shadow-xl animate-bounce-slow">
					<AppIconOpenWriter className="w-20 h-20" />
				</div>
			</div>

			<style>{`
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
			`}</style>
		</div>
	);
};

export default SplashPage;
