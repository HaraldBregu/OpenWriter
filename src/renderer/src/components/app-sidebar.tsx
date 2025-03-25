import * as React from "react"
import {
  BarChartIcon,
  CameraIcon,
  ClipboardListIcon,
  DatabaseIcon,
  FileCodeIcon,
  FileIcon,
  FileTextIcon,
  FolderIcon,
  HelpCircleIcon,
  LayoutDashboardIcon,
  ListIcon,
  SearchIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"

import comment from '../../../../resources/themeIcons/Comment.svg';
import bookmark from '../../../../resources/themeIcons/Bookmark.svg';
import list from '../../../../resources/themeIcons/list.svg';
import Comments from "@/pages/Comments"
import Bookmarks from "./Bookmarks"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: LayoutDashboardIcon,
    },
    {
      title: "Lifecycle",
      url: "#",
      icon: ListIcon,
    },
    {
      title: "Analytics",
      url: "#",
      icon: BarChartIcon,
    },
    {
      title: "Projects",
      url: "#",
      icon: FolderIcon,
    },
    {
      title: "Team",
      url: "#",
      icon: UsersIcon,
    },
    {
      title: "Team",
      url: "#",
      icon: UsersIcon,
    },
    {
      title: "Team",
      url: "#",
      icon: UsersIcon,
    },
    {
      title: "Team",
      url: "#",
      icon: UsersIcon,
    },

  ],
  navClouds: [
    {
      title: "Capture",
      icon: CameraIcon,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Proposal",
      icon: FileTextIcon,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Prompts",
      icon: FileCodeIcon,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: SettingsIcon,
    },
    {
      title: "Get Help",
      url: "#",
      icon: HelpCircleIcon,
    },
    {
      title: "Search",
      url: "#",
      icon: SearchIcon,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: DatabaseIcon,
    },
    {
      name: "Reports",
      url: "#",
      icon: ClipboardListIcon,
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: FileIcon,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarContent>
        <Tabs className="" defaultValue="comments">
          <TabsList className="bg-transparent grid w-full gap-10 grid-cols-3">
            <TabsTrigger value="comments">
              <img src={comment} alt="" />
            </TabsTrigger>
            <TabsTrigger value="bookmarks">
              <img src={bookmark} alt="" />
            </TabsTrigger>
            <TabsTrigger value="tableOfContents">
              <img src={list} alt="" />
            </TabsTrigger>
          </TabsList>
          <TabsContent value="comments">
            <Comments />
          </TabsContent>
          <TabsContent value="bookmarks">
            <Bookmarks title="Bookmarks" description="Bookmarks" action={() => {
              console.log("Bookmarks")
            }} />
          </TabsContent>
          <TabsContent value="tableOfContents">
            {/*<Card>
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>
                  Change your password here. After saving, you'll be logged out.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="current">Current password</Label>
                  <Input id="current" type="password" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new">New password</Label>
                  <Input id="new" type="password" />
                </div>
              </CardContent>
              <CardFooter>
                <Button>Save password</Button>
              </CardFooter>
            </Card>*/}
          </TabsContent>
        </Tabs>
      </SidebarContent>
    </Sidebar>
  )
}
