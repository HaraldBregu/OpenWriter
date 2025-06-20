import i18next from "i18next";
import { MenuItem, MenuItemConstructorOptions } from "electron";
import { MenuItemId } from "../../shared/types";
import { getMenuViewMode } from "../../shared/constants";

let enableTocSettingsMenu = true;
export function setEnableTocSettingsMenu(disable: boolean): void {
  enableTocSettingsMenu = disable;
}

export function buildFormatMenu(
  onClick: (menuItem: MenuItem) => void
): MenuItemConstructorOptions {
  const viewMode = getMenuViewMode();

  const menu: MenuItemConstructorOptions = {};
  menu.label = i18next.t("menu.format.label");
  menu.submenu = [
    {
      label: i18next.t("menu.format.font.label"),
      enabled: viewMode === "critix_editor",
      submenu: [
        {
          id: MenuItemId.FONT_BOLD,
          label: i18next.t("menu.format.font.bold"),
          accelerator: "CmdOrCtrl+B",
          click: (menuItem: MenuItem): void => onClick(menuItem),
        },
        {
          id: MenuItemId.FONT_ITALIC,
          label: i18next.t("menu.format.font.italic"),
          accelerator: "CmdOrCtrl+I",
          click: (menuItem: MenuItem): void => onClick(menuItem),
        },
        {
          id: MenuItemId.FONT_UNDERLINE,
          label: i18next.t("menu.format.font.underline"),
          accelerator: "CmdOrCtrl+U",
          click: (menuItem: MenuItem): void => onClick(menuItem),
        },
        {
          id: MenuItemId.FONT_STRIKETHROUGH,
          label: i18next.t("menu.format.font.strikethrough"),
          accelerator: "CmdOrCtrl+T",
          click: (menuItem: MenuItem): void => onClick(menuItem),
        },
        {
          id: MenuItemId.FONT_SUPERSCRIPT,
          label: i18next.t("menu.format.font.superscript"),
          accelerator: "CmdOrCtrl+.",
          click: (menuItem: MenuItem): void => onClick(menuItem),
        },
        {
          id: MenuItemId.FONT_SUBSCRIPT,
          label: i18next.t("menu.format.font.subscript"),
          accelerator: "CmdOrCtrl+,",
          click: (menuItem: MenuItem): void => onClick(menuItem),
        },
        {
          id: MenuItemId.FONT_NPC,
          label: i18next.t("menu.format.font.npc"),
          accelerator: "Fn+F7",
          click: (menuItem: MenuItem): void => onClick(menuItem),
        },
        { type: "separator" },
        {
          label: i18next.t("menu.format.font.characterSpacing.label"),
          submenu: [
            {
              id: MenuItemId.FONT_CHARACTER_SPACING_NORMAL,
              label: i18next.t("menu.format.font.characterSpacing.normal"),
              click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
              id: MenuItemId.FONT_CHARACTER_SPACING_TIGHTEN,
              label: i18next.t("menu.format.font.characterSpacing.tighten"),
              click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
              id: MenuItemId.FONT_CHARACTER_SPACING_LOOSEN,
              label: i18next.t("menu.format.font.characterSpacing.loosen"),
              click: (menuItem: MenuItem): void => onClick(menuItem),
            },
          ],
        },
        {
          label: i18next.t("menu.format.font.ligature.label"),
          submenu: [
            {
              id: MenuItemId.FONT_LIGATURE_DEFAULT,
              label: i18next.t("menu.format.font.ligature.default"),
              click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
              id: MenuItemId.FONT_LIGATURE_NONE,
              label: i18next.t("menu.format.font.ligature.none"),
              click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
              id: MenuItemId.FONT_LIGATURE_ALL,
              label: i18next.t("menu.format.font.ligature.all"),
              click: (menuItem: MenuItem): void => onClick(menuItem),
            },
          ],
        },
        {
          label: i18next.t("menu.format.font.captalization.label"),
          submenu: [
            {
              id: MenuItemId.FONT_CAPTALIZATION_ALL_CAPS,
              label: i18next.t("menu.format.font.captalization.allCaps"),
              click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
              id: MenuItemId.FONT_CAPTALIZATION_SMALL_CAPS,
              label: i18next.t("menu.format.font.captalization.smallCaps"),
              click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
              id: MenuItemId.FONT_CAPTALIZATION_TITLE_CASE,
              label: i18next.t("menu.format.font.captalization.titleCase"),
              click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
              id: MenuItemId.FONT_CAPTALIZATION_START_CASE,
              label: i18next.t("menu.format.font.captalization.startCase"),
              click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
              id: MenuItemId.FONT_CAPTALIZATION_NONE,
              label: i18next.t("menu.format.font.captalization.none"),
              click: (menuItem: MenuItem): void => onClick(menuItem),
            },
          ],
        },
      ],
    },
    {
      label: i18next.t("menu.format.text.label"),
      enabled: viewMode === "critix_editor",
      submenu: [
        {
          id: MenuItemId.TEXT_ALIGN_LEFT,
          label: i18next.t("menu.format.text.alignLeft"),
          accelerator: "CmdOrCtrl+shift+L",
          click: (menuItem: MenuItem): void => onClick(menuItem),
        },
        {
          id: MenuItemId.TEXT_ALIGN_CENTER,
          label: i18next.t("menu.format.text.alignCenter"),
          accelerator: "CmdOrCtrl+shift+E",
          click: (menuItem: MenuItem): void => onClick(menuItem),
        },
        {
          id: MenuItemId.TEXT_ALIGN_RIGHT,
          label: i18next.t("menu.format.text.alignRight"),
          accelerator: "CmdOrCtrl+shift+R",
          click: (menuItem: MenuItem): void => onClick(menuItem),
        },
        {
          id: MenuItemId.TEXT_ALIGN_JUSTIFY,
          label: i18next.t("menu.format.text.justify"),
          accelerator: "CmdOrCtrl+shift+J",
          click: (menuItem: MenuItem): void => onClick(menuItem),
        },
        { type: "separator" },
        {
          id: MenuItemId.TEXT_INCREASE_INDENT,
          label: i18next.t("menu.format.text.increaseIndent"),
          accelerator: "CmdOrCtrl+_",
          click: (menuItem: MenuItem): void => onClick(menuItem),
        },
        {
          id: MenuItemId.TEXT_DECREASE_INDENT,
          label: i18next.t("menu.format.text.decreaseIndent"),
          accelerator: "CmdOrCtrl+-",
          click: (menuItem: MenuItem): void => onClick(menuItem),
        },
        { type: "separator" },
        {
          label: i18next.t("menu.format.text.spacing.label"),
          submenu: [
            {
              id: MenuItemId.TEXT_SPACING_SINGLE,
              label: i18next.t("menu.format.text.spacing.single"),
              accelerator: "CmdOrCtrl+1",
              click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
              id: MenuItemId.TEXT_SPACING_1_15,
              label: i18next.t("menu.format.text.spacing.1_15"),
              accelerator: "CmdOrCtrl+2",
              click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
              id: MenuItemId.TEXT_SPACING_ONE_AND_HALF,
              label: i18next.t("menu.format.text.spacing.oneAndHalf"),
              accelerator: "CmdOrCtrl+3",
              click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            {
              id: MenuItemId.TEXT_SPACING_DOUBLE,
              label: i18next.t("menu.format.text.spacing.double"),
              accelerator: "CmdOrCtrl+4",
              click: (menuItem: MenuItem): void => onClick(menuItem),
            },
            { type: "separator" },
            {
              id: MenuItemId.CUSTOM_SPACING,
              label: i18next.t("customSpacing.title"),
              accelerator: "CmdOrCtrl+5",
              click: (menuItem: MenuItem): void => onClick(menuItem),
            },
          ],
        },
      ],
    },
    {
      label: i18next.t("menu.format.list.label"),
      enabled: viewMode === "critix_editor",
      submenu: [
        {
          id: MenuItemId.NUMBER_BULLET,
          label: i18next.t("menu.format.list.number"),
          accelerator: "CmdOrCtrl+shift+1",
          click: (menuItem: MenuItem): void => onClick(menuItem),
        },
        {
          id: MenuItemId.UPPER_LETTER_BULLET,
          label: i18next.t("menu.format.list.maxLetter"),
          accelerator: "CmdOrCtrl+shift+2",
          click: (menuItem: MenuItem): void => onClick(menuItem),
        },
        {
          id: MenuItemId.LOW_LETTER_BULLET,
          label: i18next.t("menu.format.list.lowerLetter"),
          accelerator: "CmdOrCtrl+shift+3",
          click: (menuItem: MenuItem): void => onClick(menuItem),
        },
        {
          id: MenuItemId.POINT_BULLET,
          label: i18next.t("menu.format.list.point"),
          accelerator: "CmdOrCtrl+shift+4",
          click: (menuItem: MenuItem): void => onClick(menuItem),
        },
        {
          id: MenuItemId.CIRCLE_BULLET,
          label: i18next.t("menu.format.list.emptyPoint"),
          accelerator: "CmdOrCtrl+shift+5",
          click: (menuItem: MenuItem): void => onClick(menuItem),
        },
        {
          id: MenuItemId.SQUARE_BULLET,
          label: i18next.t("menu.format.list.square"),
          accelerator: "CmdOrCtrl+shift+6",
          click: (menuItem: MenuItem): void => onClick(menuItem),
        },
        {
          id: MenuItemId.RESUME_NUMBERING,
          label: i18next.t("resumeNumbering.title"),
          accelerator: "CmdOrCtrl+shift+7",
          click: (menuItem: MenuItem): void => onClick(menuItem),
        },
        {
          id: MenuItemId.PREVIOUS_NUMBERING,
          label: i18next.t("menu.format.list.continuePreviousNumbering"),
          accelerator: "CmdOrCtrl+shift+8",
          click: (menuItem: MenuItem): void => onClick(menuItem),
        },
      ],
    },
    {
      id: MenuItemId.PAGE_NUMBER,
      label: i18next.t("menu.format.pageNumber.label"),
      click: (menuItem: MenuItem): void => onClick(menuItem),
      enabled: viewMode === "critix_editor",
    },
    {
      id: MenuItemId.OPEN_LINE_NUMBER_SETTINGS,
      label: i18next.t("menu.format.lineNumber.label"),
      click: (menuItem: MenuItem): void => onClick(menuItem),
      enabled: viewMode === "critix_editor",
    },
    {
      id: MenuItemId.SECTIONS_STYLE,
      label: i18next.t("menu.format.sectionsStyle"),
      click: (menuItem: MenuItem): void => onClick(menuItem),
      enabled: viewMode === "critix_editor",
    },
    {
      id: MenuItemId.OPEN_HEADER_SETTINGS,
      label: i18next.t("menu.format.header.label"),
      click: (menuItem: MenuItem): void => onClick(menuItem),
      enabled: viewMode === "critix_editor",
    },
    {
      id: MenuItemId.OPEN_FOOTER_SETTINGS,
      label: i18next.t("menu.format.footer.label"),
      click: (menuItem: MenuItem): void => onClick(menuItem),
      enabled: viewMode === "critix_editor",
    },
    {
      id: MenuItemId.OPEN_TOC_SETTINGS,
      label: i18next.t("menu.format.toc.label"),
      click: (menuItem: MenuItem): void => onClick(menuItem),
      enabled: viewMode === "critix_editor" && enableTocSettingsMenu,
    },
    {
      id: MenuItemId.REMOVE_LINK,
      label: i18next.t("menu.format.removeLink"),
      accelerator: "CmdOrCtrl+Shift+K",
      click: (menuItem: MenuItem): void => onClick(menuItem),
      enabled: viewMode === "critix_editor",
    },
    {
      id: MenuItemId.CHANGE_TEMPLATE,
      label: i18next.t("menu.format.changeTemplate"),
      click: (menuItem: MenuItem): void => onClick(menuItem),
      enabled: viewMode === "critix_editor",
    },
    {
      id: MenuItemId.LAYOUT_PAGE_SETUP,
      label: i18next.t("menu.format.layout.label"),
      accelerator: "CmdOrCtrl+Shift+P",
      click: (menuItem: MenuItem): void => onClick(menuItem),
      enabled: viewMode === "critix_editor",
    },
  ];

  return menu;
}
