import { useEffect, type ReactElement } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
	PageBody,
	PageContainer,
	PageHeader,
	PageHeaderTitle,
	PageSidebar,
	PageSidebarInset,
} from '@/components/app/base/page';
import { Button } from '@/components/ui/Button';
import { AGENT_DEFINITIONS, AgentsProvider, useAgentsContext } from './Provider';

function Bootstrap(): null {
	const { setAgents, setLoadStatus, ensureModelsLoaded, agentsById, modelsCache } =
		useAgentsContext();

	useEffect(() => {
		let active = true;

		(async () => {
			try {
				const stored = await window.app.getAgents();
				if (!active) return;
				const storedById = new Map(stored.map((a) => [a.id, a]));
				const merged = Object.fromEntries(
					AGENT_DEFINITIONS.map((def) => {
						const existing = storedById.get(def.id);
						return [
							def.id,
							existing ?? { id: def.id, name: def.name, models: [] },
						];
					})
				);
				setAgents(merged);
				setLoadStatus({ type: 'idle' });
			} catch (error) {
				if (!active) return;
				setLoadStatus({
					type: 'error',
					message:
						error instanceof Error ? error.message : 'Unable to load agent settings.',
				});
			}
		})();

		return () => {
			active = false;
		};
	}, [setAgents, setLoadStatus]);

	useEffect(() => {
		const providerIds = new Set<string>();
		Object.values(agentsById).forEach((agent) => {
			agent.models.forEach((m) => {
				if (m.providerId) providerIds.add(m.providerId);
			});
		});
		providerIds.forEach((pid) => {
			if (!modelsCache[pid]) void ensureModelsLoaded(pid);
		});
	}, [agentsById, modelsCache, ensureModelsLoaded]);

	return null;
}

interface NavItemProps {
	readonly to: string;
	readonly label: string;
}

function NavItem({ to, label }: NavItemProps): ReactElement {
	return (
		<NavLink to={to} end className="block outline-none">
			{({ isActive }) => (
				<Button
					nativeButton={false}
					variant={isActive ? 'secondary' : 'ghost'}
					size="md"
					className="w-full justify-start"
					render={<span />}
				>
					{label}
				</Button>
			)}
		</NavLink>
	);
}

export default function Layout(): ReactElement {
	const { t } = useTranslation();

	return (
		<AgentsProvider>
			<Bootstrap />
			<PageContainer>
				<PageHeader>
					<PageHeaderTitle>{t('agents.title', 'Agents')}</PageHeaderTitle>
				</PageHeader>
				<PageBody className="flex-row overflow-hidden p-0">
					<PageSidebar className="w-64 border-r-0">
						<div className="flex flex-col gap-0.5">
							<NavItem
								to="/agents/content-reviewer"
								label={t('agents.contentReviewer', 'Content Reviewer')}
							/>
							<NavItem
								to="/agents/content-writer"
								label={t('agents.contentWriter', 'Content Writer')}
							/>
							<NavItem
								to="/agents/image-creator"
								label={t('agents.imageCreator', 'Image Creator')}
							/>
							<NavItem to="/agents/assistant" label={t('agents.assistant', 'Assistant')} />
						</div>
					</PageSidebar>
					<PageSidebarInset>
						<Outlet />
					</PageSidebarInset>
				</PageBody>
			</PageContainer>
		</AgentsProvider>
	);
}
