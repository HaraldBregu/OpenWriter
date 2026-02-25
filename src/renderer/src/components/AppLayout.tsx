import React, { useState, useCallback, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../hooks/useLanguage";
import { usePostsLoader } from "../hooks/usePostsLoader";
import { usePostsFileWatcher } from "../hooks/usePostsFileWatcher";
import { usePersonalityFiles } from "../hooks/usePersonalityFiles";
import { useOutputFiles } from "../hooks/useOutputFiles";
import { usePostContextMenu } from "../hooks/usePostContextMenu";
import { useWritingContextMenu } from "../hooks/useWritingContextMenu";
import { useAppSelector } from "../store";
import { selectPosts } from "../store/postsSlice";
import { selectWritings } from "../store/writingsSlice";
import { TitleBar } from "./TitleBar";
import {
  AppPopover,
  AppPopoverContent,
  AppPopoverTrigger,
  AppSeparator,
  AppSidebar,
  AppSidebarContent,
  AppSidebarGroup,
  AppSidebarGroupContent,
  AppSidebarMenu,
  AppSidebarMenuButton,
  AppSidebarMenuItem,
  AppSidebarMenuSub,
  AppSidebarMenuSubItem,
  AppSidebarMenuSubButton,
  AppSidebarSeparator,
  AppSidebarProvider,
  AppSidebarInset,
  AppSidebarHeader,
  AppSidebarFooter,
  useSidebar,
} from "./app";
import logoIcon from "@resources/icons/icon.png";
import {
  PenLine,
  FolderOpen,
  Settings,
  User,
  Shield,
  LogOut,
  CreditCard,
  HelpCircle,
  ChevronRight,
  Bell,
  Bug,
  PlusCircle,
  FileText,
  Heart,
  Lightbulb,
  Flame,
  Scale,
  Shuffle,
  Sprout,
  Users,
  Palette,
  Hourglass,
  GitMerge,
} from "lucide-react";

interface AppLayoutProps {
  readonly children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Nav items — slugs and shortcuts are locale-independent; labels use i18n
// ---------------------------------------------------------------------------

const quickCreateSlugs = [
  { titleKey: "sidebar.write",   icon: PenLine,   url: "/new/writing", shortcut: "⌘W" },
  { titleKey: "sidebar.newPost", icon: PlusCircle, url: "/new/post",   shortcut: "⌘N" },
];

const topNavSectionKeys = ["sidebar.writing", "sidebar.posts"];

const personalitySlugs = [
  { titleKey: "personalityItems.emotionalDepth", icon: Heart,    slug: "emotional-depth" },
  { titleKey: "personalityItems.consciousness",  icon: Lightbulb, slug: "consciousness" },
  { titleKey: "personalityItems.motivation",     icon: Flame,    slug: "motivation" },
  { titleKey: "personalityItems.moralIntuition", icon: Scale,    slug: "moral-intuition" },
  { titleKey: "personalityItems.irrationality",  icon: Shuffle,  slug: "irrationality" },
  { titleKey: "personalityItems.growth",         icon: Sprout,   slug: "growth" },
  { titleKey: "personalityItems.socialIdentity", icon: Users,    slug: "social-identity" },
  { titleKey: "personalityItems.creativity",     icon: Palette,  slug: "creativity" },
  { titleKey: "personalityItems.mortality",      icon: Hourglass, slug: "mortality" },
  { titleKey: "personalityItems.contradiction",  icon: GitMerge, slug: "contradiction" },
];

// ---------------------------------------------------------------------------
// Settings popover menu items
// ---------------------------------------------------------------------------

interface SettingsMenuItem {
  titleKey: string;
  icon: React.ElementType;
  url?: string;
  danger?: boolean;
  divider?: boolean;
}

const settingsMenuItems: SettingsMenuItem[] = [
  { titleKey: "menu.account",       icon: User },
  { titleKey: "menu.settings",      icon: Settings, url: "/settings" },
  { titleKey: "menu.notifications", icon: Bell },
  { titleKey: "menu.privacy",       icon: Shield },
  { titleKey: "menu.billing",       icon: CreditCard },
  { titleKey: "menu.helpAndSupport", icon: HelpCircle },
];

// ---------------------------------------------------------------------------
// SettingsPopover
// ---------------------------------------------------------------------------

// Stub — replace with real auth state
const currentUser: { name: string } | null = { name: "John Doe" };

const SettingsPopover = React.memo(function SettingsPopover() {
  const { t } = useTranslation();
  return (
    <AppPopover>
      <AppPopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <span className="flex-1 truncate text-sm text-left">
            {currentUser ? currentUser.name : t("common.signIn")}
          </span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
        </button>
      </AppPopoverTrigger>
      <AppPopoverContent side="top" align="start" className="w-64 p-0">
        <div className="py-1">
          {settingsMenuItems.map((item) => {
            const Icon = item.icon;
            const label = t(item.titleKey);
            const className =
              "flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors";
            return item.url ? (
              <Link key={item.titleKey} to={item.url} className={className}>
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{label}</span>
              </Link>
            ) : (
              <button key={item.titleKey} type="button" className={className}>
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{label}</span>
              </button>
            );
          })}

          {currentUser && (
            <>
              <AppSeparator className="my-1" />
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>{t("common.logOut")}</span>
              </button>
            </>
          )}
        </div>
      </AppPopoverContent>
    </AppPopover>
  );
});
SettingsPopover.displayName = "SettingsPopover";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// AppLayoutInner — rendered inside AppSidebarProvider so it can call useSidebar
// ---------------------------------------------------------------------------

function AppLayoutInner({ children }: AppLayoutProps) {
  const { toggleSidebar } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const posts = useAppSelector(selectPosts);
  const writings = useAppSelector(selectWritings);

  // Subscribe to IPC context-menu events. Each hook uses the ref pattern
  // internally so re-subscriptions never occur on post/writing array changes.
  usePostContextMenu(posts);
  useWritingContextMenu(writings);

  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({
    Posts: true,
    Writing: true,
    Knowledge: false,
    Personality: false,
  });

  const [workspaceName, setWorkspaceName] = useState<string>("OpenWriter");

  // Load workspace name on mount
  useEffect(() => {
    async function loadWorkspaceName() {
      try {
        const workspacePath = await window.workspace.getCurrent();
        if (workspacePath) {
          // Extract folder name from path
          const pathParts =
            typeof workspacePath === "string"
              ? workspacePath.split(/[/\\]/)
              : [];
          const folderName = pathParts[pathParts.length - 1];
          setWorkspaceName(folderName ? `${folderName} (workspace)` : "OpenWriter");
        }
      } catch (error) {
        console.error("[AppLayout] Failed to load workspace name:", error);
      }
    }

    loadWorkspaceName();
  }, []);

  const toggleSection = useCallback(
    (title: string) =>
      setSectionsOpen((prev) => ({ ...prev, [title]: !prev[title] })),
    [],
  );

  const handleNewPost = useCallback(() => {
    navigate("/new/post", { state: { draftKey: Date.now() } });
  }, [navigate]);

  const handleNewWriting = useCallback(() => {
    navigate("/new/writing", { state: { draftKey: Date.now() } });
  }, [navigate]);

  const handlePostContextMenu = useCallback(
    (postId: string, postTitle: string) => {
      window.contextMenu.showPost(postId, postTitle);
    },
    [],
  );

  const handleWritingContextMenu = useCallback(
    (writingId: string, writingTitle: string) => {
      window.contextMenu.showWriting(writingId, writingTitle);
    },
    [],
  );

  return (
    <>
      <TitleBar title={workspaceName} onToggleSidebar={toggleSidebar} />

      <div className="flex flex-1 min-h-0 w-full">
        <AppSidebar className="border-r top-12 h-[calc(100svh-3rem)]">
          {/* Header */}
          <AppSidebarHeader className="border-b p-4">
            <Link
              to="/home"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <img
                src={logoIcon}
                alt="OpenWriter"
                className="h-6 w-6 rounded-full object-cover"
              />
              <span className="text-md font-normal tracking-tight">
                OpenWriter
              </span>
            </Link>
          </AppSidebarHeader>

          {/* Nav */}
          <AppSidebarContent className="gap-0 py-2">
            <AppSidebarGroup className="py-0">
              <AppSidebarGroupContent>
                <AppSidebarMenu>
                  {/* Quick-create items */}
                  {quickCreateItems.map((item) => {
                    const Icon = item.icon;
                    const isNewPost = item.title === "New Post";
                    const isNewWriting = item.title === "New Writing";
                    const hasClickHandler = isNewPost || isNewWriting;
                    const clickHandler = isNewPost
                      ? handleNewPost
                      : isNewWriting
                        ? handleNewWriting
                        : undefined;
                    return (
                      <AppSidebarMenuItem key={item.title}>
                        <AppSidebarMenuButton
                          asChild={!hasClickHandler}
                          // isActive={location.pathname === item.url}
                          className="h-9 px-3 group/item"
                          onClick={clickHandler}
                        >
                          {hasClickHandler ? (
                            <>
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="flex-1 truncate">
                                {item.title}
                              </span>
                              <span className="text-xs text-muted-foreground/40 invisible group-hover/item:visible">
                                {item.shortcut}
                              </span>
                            </>
                          ) : (
                            <Link to={item.url}>
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="flex-1 truncate">
                                {item.title}
                              </span>
                              <span className="text-xs text-muted-foreground/40 invisible group-hover/item:visible">
                                {item.shortcut}
                              </span>
                            </Link>
                          )}
                        </AppSidebarMenuButton>
                      </AppSidebarMenuItem>
                    );
                  })}

                  <AppSidebarSeparator className="my-1" />

                  {/* Posts, Writing — collapsible section headers */}
                  {topNavSections.map((section) => {
                    const isOpen = sectionsOpen[section];
                    const isPosts = section === "Posts";
                    const isWriting = section === "Writing";
                    return (
                      <AppSidebarMenuItem key={section}>
                        <button
                          type="button"
                          onClick={() => toggleSection(section)}
                          className="flex w-full items-center justify-between h-8 px-3 text-xs font-medium text-sidebar-foreground/50 select-none cursor-pointer"
                        >
                          <span className="tracking-wider">{section}</span>
                          <ChevronRight
                            className={`h-2.5 w-2.5 shrink-0 text-muted-foreground/40 transition-transform duration-200 ${sectionsOpen["Knowledge"] ? "rotate-90" : ""}`}
                          />
                        </button>
                        {isOpen && (
                          <AppSidebarMenuSub className="border-none ml-0">
                            {isPosts &&
                              posts.map((post) => (
                                <AppSidebarMenuSubItem
                                  key={post.id}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    handlePostContextMenu(
                                      post.id,
                                      post.title || "Untitled Post",
                                    );
                                  }}
                                >
                                  <AppSidebarMenuSubButton
                                    asChild
                                    isActive={
                                      location.pathname ===
                                      `/new/post/${post.id}`
                                    }
                                    className="ml-0"
                                  >
                                    <Link
                                      to={`/new/post/${post.id}`}
                                      className="ml-0"
                                    >
                                      <FileText className="h-3.5 w-3.5 shrink-0" />
                                      <span className="flex-1 truncate">
                                        {post.title || "Untitled Post"}
                                      </span>
                                      <span className="text-xs text-muted-foreground/40 shrink-0">
                                        {formatRelativeTime(post.updatedAt)}
                                      </span>
                                    </Link>
                                  </AppSidebarMenuSubButton>
                                </AppSidebarMenuSubItem>
                              ))}
                            {isWriting &&
                              writings.map((writing) => (
                                <AppSidebarMenuSubItem key={writing.id}>
                                  <AppSidebarMenuSubButton
                                    asChild
                                    isActive={
                                      location.pathname ===
                                      `/new/writing/${writing.id}`
                                    }
                                    className="ml-0"
                                    onContextMenu={() =>
                                      handleWritingContextMenu(
                                        writing.id,
                                        writing.title,
                                      )
                                    }
                                  >
                                    <Link
                                      to={`/new/writing/${writing.id}`}
                                      className="ml-0"
                                    >
                                      <PenLine className="h-3.5 w-3.5 shrink-0" />
                                      <span className="flex-1 truncate">
                                        {writing.title || "Untitled Writing"}
                                      </span>
                                      <span className="text-xs text-muted-foreground/40 shrink-0">
                                        {formatRelativeTime(writing.updatedAt)}
                                      </span>
                                    </Link>
                                  </AppSidebarMenuSubButton>
                                </AppSidebarMenuSubItem>
                              ))}
                          </AppSidebarMenuSub>
                        )}
                      </AppSidebarMenuItem>
                    );
                  })}

                  {/* Knowledge — collapsible section */}
                  <AppSidebarMenuItem>
                    <button
                      type="button"
                      onClick={() => toggleSection("Knowledge")}
                      className="flex w-full items-center justify-between h-8 px-3 text-xs font-medium text-sidebar-foreground/50 select-none cursor-pointer"
                    >
                      <span className="tracking-wider">Knowledge</span>
                      <ChevronRight
                        className={`h-2.5 w-2.5 shrink-0 text-muted-foreground/40 transition-transform duration-200 ${sectionsOpen["Knowledge"] ? "rotate-90" : ""}`}
                      />
                    </button>
                    {sectionsOpen["Knowledge"] && (
                      <AppSidebarMenuSub className="border-none ml-0">
                        <AppSidebarMenuSubItem>
                          <AppSidebarMenuSubButton
                            asChild
                            isActive={location.pathname === "/documents"}
                            className="ml-0"
                          >
                            <Link to="/documents" className="ml-0">
                              <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                              <span className="flex-1 truncate">Documents</span>
                            </Link>
                          </AppSidebarMenuSubButton>
                        </AppSidebarMenuSubItem>
                        <AppSidebarMenuSubItem>
                          <AppSidebarMenuSubButton
                            asChild
                            isActive={location.pathname === "/directories"}
                            className="ml-0"
                          >
                            <Link to="/directories" className="ml-0">
                              <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                              <span className="flex-1 truncate">
                                Directories
                              </span>
                            </Link>
                          </AppSidebarMenuSubButton>
                        </AppSidebarMenuSubItem>
                      </AppSidebarMenuSub>
                    )}
                  </AppSidebarMenuItem>

                  {/* Personality — collapsible section */}
                  <AppSidebarMenuItem>
                    <button
                      type="button"
                      onClick={() => toggleSection("Personality")}
                      className="flex w-full items-center justify-between h-8 px-3 text-xs font-medium text-sidebar-foreground/50 select-none cursor-pointer"
                    >
                      <span className="tracking-wider">Personality</span>
                      <ChevronRight
                        className={`h-2.5 w-2.5 shrink-0 text-muted-foreground/40 transition-transform duration-200 ${sectionsOpen["Personality"] ? "rotate-90" : ""}`}
                      />
                    </button>
                    {sectionsOpen["Personality"] && (
                      <AppSidebarMenuSub className="border-none ml-0">
                        {personalityItems.map((item) => {
                          const Icon = item.icon;
                          const itemPath = `/personality/${item.slug}`;
                          return (
                            <AppSidebarMenuSubItem key={item.slug}>
                              <AppSidebarMenuSubButton
                                asChild
                                isActive={location.pathname === itemPath}
                                className="ml-0"
                              >
                                <Link to={itemPath} className="ml-0">
                                  <Icon className="h-3.5 w-3.5 shrink-0" />
                                  <span className="flex-1 truncate">
                                    {item.title}
                                  </span>
                                </Link>
                              </AppSidebarMenuSubButton>
                            </AppSidebarMenuSubItem>
                          );
                        })}
                      </AppSidebarMenuSub>
                    )}
                  </AppSidebarMenuItem>

                  <AppSidebarSeparator className="my-1" />

                  {/* Debug (Dev Tool) */}
                  <AppSidebarMenuItem>
                    <AppSidebarMenuButton
                      asChild
                      isActive={location.pathname === "/debug"}
                      className="h-9 px-3"
                    >
                      <Link to="/debug">
                        <Bug className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1 truncate">Debug Tools</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-mono uppercase tracking-wider">
                          Dev
                        </span>
                      </Link>
                    </AppSidebarMenuButton>
                  </AppSidebarMenuItem>
                </AppSidebarMenu>
              </AppSidebarGroupContent>
            </AppSidebarGroup>
          </AppSidebarContent>

          {/* Footer — Settings popover */}
          <AppSidebarFooter className="border-t px-3 py-3">
            <SettingsPopover />
          </AppSidebarFooter>
        </AppSidebar>

        <AppSidebarInset className="flex flex-col flex-1 min-h-0">
          <main className="flex-1 overflow-y-auto bg-background">
            {children}
          </main>
        </AppSidebarInset>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// AppLayout
// ---------------------------------------------------------------------------

export function AppLayout({ children }: AppLayoutProps) {
  useLanguage();
  usePostsLoader(); // Load posts from workspace on app startup
  usePostsFileWatcher(); // Listen for external file changes in posts directory
  usePersonalityFiles(); // Load personality files from workspace on app startup
  useOutputFiles(); // Load output files (posts, writings) from workspace

  return (
    <div className="flex flex-col h-screen">
      <AppSidebarProvider className="flex-col flex-1 min-h-0">
        <AppLayoutInner>{children}</AppLayoutInner>
      </AppSidebarProvider>
    </div>
  );
}
