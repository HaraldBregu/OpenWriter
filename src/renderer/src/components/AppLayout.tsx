import React, { useState, useCallback, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import { useLanguage } from "../hooks/useLanguage";
import { usePostsLoader } from "../hooks/usePostsLoader";
import { usePostsFileWatcher } from "../hooks/usePostsFileWatcher";
import { usePersonalityFiles } from "../hooks/usePersonalityFiles";
import { useAppDispatch, useAppSelector } from "../store";
import {
  createPost,
  selectPosts,
  deletePost,
  updatePostTitle,
  updatePostBlocks,
  updatePostCategory,
  updatePostTags,
  updatePostVisibility,
} from "../store/postsSlice";
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
  StickyNote,
  MessageSquare,
  FolderOpen,
  Settings,
  User,
  Shield,
  LogOut,
  CreditCard,
  HelpCircle,
  ChevronRight,
  Bell,
  FlaskConical,
  Bug,
  PlusCircle,
  FileText,
  Download,
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
// Nav items
// ---------------------------------------------------------------------------

const quickCreateItems = [
  { title: "New Post", icon: PlusCircle, url: "/new/post", shortcut: "⌘N" },
  { title: "New Writing", icon: PenLine, url: "/new/writing", shortcut: "⌘W" },
  { title: "New Note", icon: StickyNote, url: "/new/note", shortcut: "⌘⇧N" },
  {
    title: "New Message",
    icon: MessageSquare,
    url: "/new/message",
    shortcut: "⌘M",
  },
];

const topNavSections = ["Posts", "Writing", "Notes", "Messages"];

const personalityItems = [
  { title: "Emotional Depth", icon: Heart, slug: "emotional-depth" },
  { title: "Consciousness", icon: Lightbulb, slug: "consciousness" },
  { title: "Motivation", icon: Flame, slug: "motivation" },
  { title: "Moral Intuition", icon: Scale, slug: "moral-intuition" },
  { title: "Irrationality", icon: Shuffle, slug: "irrationality" },
  { title: "Growth", icon: Sprout, slug: "growth" },
  { title: "Social Identity", icon: Users, slug: "social-identity" },
  { title: "Creativity", icon: Palette, slug: "creativity" },
  { title: "Mortality", icon: Hourglass, slug: "mortality" },
  { title: "Contradiction", icon: GitMerge, slug: "contradiction" },
];

// ---------------------------------------------------------------------------
// Settings popover menu items
// ---------------------------------------------------------------------------

interface SettingsMenuItem {
  title: string;
  icon: React.ElementType;
  url?: string;
  danger?: boolean;
  divider?: boolean;
}

const settingsMenuItems: SettingsMenuItem[] = [
  { title: "Account", icon: User },
  { title: "Settings", icon: Settings, url: "/settings" },
  { title: "Notifications", icon: Bell },
  { title: "Privacy", icon: Shield },
  { title: "Billing", icon: CreditCard },
  { title: "Help & Support", icon: HelpCircle },
];

// ---------------------------------------------------------------------------
// SettingsPopover
// ---------------------------------------------------------------------------

// Stub — replace with real auth state
const currentUser: { name: string } | null = { name: "John Doe" };

const SettingsPopover = React.memo(function SettingsPopover() {
  return (
    <AppPopover>
      <AppPopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <span className="flex-1 truncate text-sm text-left">
            {currentUser ? currentUser.name : "Sign in"}
          </span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
        </button>
      </AppPopoverTrigger>
      <AppPopoverContent side="top" align="start" className="w-64 p-0">
        <div className="py-1">
          {settingsMenuItems.map((item) => {
            const Icon = item.icon;
            const className =
              "flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors";
            return item.url ? (
              <Link key={item.title} to={item.url} className={className}>
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{item.title}</span>
              </Link>
            ) : (
              <button key={item.title} type="button" className={className}>
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{item.title}</span>
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
                <span>Log out</span>
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
  const dispatch = useAppDispatch();
  const posts = useAppSelector(selectPosts);

  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({
    Posts: false,
    Writing: false,
    Notes: false,
    Messages: false,
    Personality: false,
  });

  const [workspaceName, setWorkspaceName] = useState<string>("Tesseract AI");

  // Load workspace name on mount
  useEffect(() => {
    async function loadWorkspaceName() {
      try {
        const workspacePath = await window.api.workspaceGetCurrent();
        if (workspacePath) {
          // Extract folder name from path
          const pathParts = typeof workspacePath === 'string' ? workspacePath.split(/[/\\]/) : [];
          const folderName = pathParts[pathParts.length - 1];
          setWorkspaceName(`${folderName} (workspace)` || "Tesseract AI");
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
    const action = createPost();
    dispatch(action);
    navigate(`/new/post/${action.payload.id}`);
  }, [dispatch, navigate]);

  const handlePostContextMenu = useCallback(
    (postId: string, postTitle: string) => {
      window.api.showPostContextMenu(postId, postTitle);
    },
    [],
  );

  // Listen for context menu actions
  useEffect(() => {
    const cleanup = window.api.onPostContextMenuAction((data) => {
      const { action, postId } = data;

      switch (action) {
        case "open":
          navigate(`/new/post/${postId}`);
          break;

        case "duplicate": {
          // Find the source post
          const sourcePost = posts.find((p) => p.id === postId);
          if (!sourcePost) break;

          // Create a new post
          const newPostAction = createPost();
          dispatch(newPostAction);
          const newPostId = newPostAction.payload.id;

          // Copy all fields from source post to new post
          dispatch(
            updatePostTitle({
              postId: newPostId,
              title: `${sourcePost.title} (Copy)`,
            }),
          );
          dispatch(
            updatePostBlocks({ postId: newPostId, blocks: sourcePost.blocks }),
          );
          dispatch(
            updatePostCategory({
              postId: newPostId,
              category: sourcePost.category,
            }),
          );
          dispatch(
            updatePostTags({ postId: newPostId, tags: sourcePost.tags }),
          );
          dispatch(
            updatePostVisibility({
              postId: newPostId,
              visibility: sourcePost.visibility,
            }),
          );

          // Navigate to the new post
          navigate(`/new/post/${newPostId}`);
          break;
        }

        case "rename":
          // Navigate to the post page (title is editable there)
          navigate(`/new/post/${postId}`);
          break;

        case "delete":
          dispatch(deletePost(postId));
          // If currently viewing this post, navigate to home
          if (location.pathname === `/new/post/${postId}`) {
            navigate("/home");
          }
          break;
      }
    });

    return cleanup;
  }, [dispatch, navigate, location.pathname, posts]);

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
                alt="Tesseract AI"
                className="h-6 w-6 rounded-full object-cover"
              />
              <span className="text-md font-normal tracking-tight">
                Tesseract AI
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
                    return (
                      <AppSidebarMenuItem key={item.title}>
                        <AppSidebarMenuButton
                          asChild={!isNewPost}
                          // isActive={location.pathname === item.url}
                          className="h-9 px-3 group/item"
                          onClick={isNewPost ? handleNewPost : undefined}
                        >
                          {isNewPost ? (
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

                  {/* Posts, Writing, Notes, Messages — collapsible section headers */}
                  {topNavSections.map((section) => {
                    const isOpen = sectionsOpen[section];
                    const isPosts = section === "Posts";
                    return (
                      <AppSidebarMenuItem key={section}>
                        <button
                          type="button"
                          onClick={() => toggleSection(section)}
                          className="flex w-full items-center gap-1 h-8 px-3 text-xs font-medium text-sidebar-foreground/50 select-none cursor-pointer"
                        >
                          <span className="uppercase tracking-wider">
                            {section}
                          </span>
                          <ChevronRight
                            className={`h-2.5 w-2.5 shrink-0 text-muted-foreground/40 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
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
                          </AppSidebarMenuSub>
                        )}
                      </AppSidebarMenuItem>
                    );
                  })}

                  <AppSidebarSeparator className="my-1" />

                  {/* Knowledge - Label */}
                  <div className="px-3 py-2">
                    <span className="text-xs font-medium text-muted-foreground/50">
                      Knowledge
                    </span>
                  </div>

                  {/* Documents */}
                  <AppSidebarMenuItem>
                    <AppSidebarMenuButton
                      asChild
                      isActive={location.pathname === "/documents"}
                      className="h-9 px-3"
                    >
                      <Link to="/documents">
                        <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1 truncate">Documents</span>
                      </Link>
                    </AppSidebarMenuButton>
                  </AppSidebarMenuItem>

                  {/* Directories */}
                  <AppSidebarMenuItem>
                    <AppSidebarMenuButton
                      asChild
                      isActive={location.pathname === "/directories"}
                      className="h-9 px-3"
                    >
                      <Link to="/directories">
                        <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1 truncate">Directories</span>
                      </Link>
                    </AppSidebarMenuButton>
                  </AppSidebarMenuItem>

                  {/* Personality — collapsible section */}
                  <AppSidebarMenuItem>
                    <button
                      type="button"
                      onClick={() => toggleSection("Personality")}
                      className="flex w-full items-center gap-1 h-8 px-3 text-xs font-medium text-sidebar-foreground/50 select-none cursor-pointer"
                    >
                      <span className="uppercase tracking-wider">
                        Personality
                      </span>
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

                  {/* Pipeline Test (Dev Tool) */}
                  <AppSidebarMenuItem>
                    <AppSidebarMenuButton
                      asChild
                      isActive={location.pathname === "/pipeline-test"}
                      className="h-9 px-3"
                    >
                      <Link to="/pipeline-test">
                        <FlaskConical className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1 truncate">Pipeline Test</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono uppercase tracking-wider">
                          Dev
                        </span>
                      </Link>
                    </AppSidebarMenuButton>
                  </AppSidebarMenuItem>

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

                  {/* Downloads Demo (Dev Tool) */}
                  <AppSidebarMenuItem>
                    <AppSidebarMenuButton
                      asChild
                      isActive={location.pathname === "/downloads-demo"}
                      className="h-9 px-3"
                    >
                      <Link to="/downloads-demo">
                        <Download className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1 truncate">Downloads Demo</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400 font-mono uppercase tracking-wider">
                          Demo
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
  useTheme();
  useLanguage();
  usePostsLoader(); // Load posts from workspace on app startup
  usePostsFileWatcher(); // Listen for external file changes in posts directory
  usePersonalityFiles(); // Load personality files from workspace on app startup

  return (
    <div className="flex flex-col h-screen">
      <AppSidebarProvider className="flex-col flex-1 min-h-0">
        <AppLayoutInner>{children}</AppLayoutInner>
      </AppSidebarProvider>
    </div>
  );
}
