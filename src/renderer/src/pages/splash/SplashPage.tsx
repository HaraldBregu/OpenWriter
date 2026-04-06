import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { selectAllDocuments } from '@/store/documents';
import { AppIconOpenWriter } from '@/components/app/icons/AppIconOpenWriter';

const SplashPage: React.FC = () => {
	const navigate = useNavigate();
	const allDocuments = useAppSelector(selectAllDocuments);

	useEffect(() => {
		const timer = setTimeout(() => {
			navigate('/');
		}, 3000);

		return () => clearTimeout(timer);
	}, [navigate]);

	return (
		<div className="flex items-center justify-center h-screen w-screen bg-gradient-to-br from-background via-background to-background/95">
			<div className="text-center space-y-8 animate-fade-in">
				<div className="flex justify-center">
					<div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-foreground/10 to-foreground/5 border border-foreground/10 flex items-center justify-center shadow-xl animate-bounce-slow">
						<AppIconOpenWriter className="w-16 h-16" />
					</div>
				</div>

				<div className="space-y-3">
					<h1 className="text-4xl font-bold text-foreground tracking-tight">OpenWriter</h1>
					<p className="text-base text-muted-foreground font-light">
						{allDocuments.length > 0 ? 'Welcome back' : 'Getting started'}
					</p>
				</div>

				<div className="flex justify-center gap-2">
					<div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" />
					<div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce delay-100" />
					<div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce delay-200" />
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

				.delay-100 {
					animation-delay: 0.1s;
				}

				.delay-200 {
					animation-delay: 0.2s;
				}
			`}</style>
		</div>
	);
};

export default SplashPage;
