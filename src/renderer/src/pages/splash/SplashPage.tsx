import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { selectAllDocuments } from '@/store/documents';

const SplashPage: React.FC = () => {
	const navigate = useNavigate();
	const allDocuments = useAppSelector(selectAllDocuments);

	useEffect(() => {
		const timer = setTimeout(() => {
			navigate('/');
		}, 2000);

		return () => clearTimeout(timer);
	}, [navigate]);

	return (
		<div className="flex items-center justify-center h-screen w-screen bg-gradient-to-br from-background to-background/95">
			<div className="text-center space-y-6 animate-fade-in">
				<div className="flex justify-center">
					<div className="w-20 h-20 rounded-2xl bg-foreground/5 border border-foreground/10 flex items-center justify-center animate-pulse">
						<svg
							className="w-10 h-10 text-foreground"
							fill="currentColor"
							viewBox="0 0 24 24"
						>
							<path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
						</svg>
					</div>
				</div>

				<div className="space-y-2">
					<h1 className="text-3xl font-semibold text-foreground tracking-tight">
						OpenWriter
					</h1>
					<p className="text-sm text-muted-foreground">
						{allDocuments.length > 0 ? 'Welcome back' : 'Getting started'}
					</p>
				</div>

				<div className="flex justify-center gap-1.5">
					<div className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-bounce" />
					<div className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-bounce delay-100" />
					<div className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-bounce delay-200" />
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

				.animate-fade-in {
					animation: fade-in 0.6s ease-in-out;
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
