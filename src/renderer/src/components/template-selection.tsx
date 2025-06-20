import { createContext, ReactNode, useContext } from "react";
import * as RadioGroup from "@radix-ui/react-radio-group";
import CarocciTemplate from "./icons/CarocciTemplate";
import BlankTemplate from "./icons/BlankTemplate";
import Typography from "./Typography";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";


type TemplateItemAs =
  | { type: 'input'; onChange: (event: any) => void; value: string }

interface TemplateItemProps {
  id: string,
  name?: string,
  value: string,
  icon?: keyof typeof TEMPLATE_ICONS
  as?: TemplateItemAs
}

interface TemplateCategoryProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

interface TemplateSelectionProps {
  children: ReactNode;
  defaultValue?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  value?: string;
}

export const TEMPLATE_ICONS = {
  blank: <BlankTemplate width="100%" height="100%" />,
  other: <CarocciTemplate width="100%" height="100%" />
}

type RadioGroupContextProps = TemplateSelectionProps & {};

const RadioGroupContext = createContext<RadioGroupContextProps | null>(null);

export const useRadioGroupContext = () => {
  const context = useContext(RadioGroupContext);
  if (!context) {
    throw new Error("useRadioGroupContext must be used within a RadioGroupProvider");
  }
  return context;
};

interface RadioGroupProviderProps {
  value: RadioGroupContextProps,
  children: ReactNode;
}

export const RadioGroupProvider = ({ children, value }: RadioGroupProviderProps) => {
  return <RadioGroupContext.Provider value={value}>{children}</RadioGroupContext.Provider>;
};

function TemplateItem({ id, value, icon = "other", name, as }: TemplateItemProps) {
  const { disabled } = useRadioGroupContext();
  const isInput = as?.type === "input";

  const radioItemClasses = cn(
    "group flex flex-col items-center p-[2px]",
    {
      "cursor-pointer": !disabled,
    }
  );

  const iconOverlayClasses = cn(
    "group-data-[state=checked]:bg-primary-80 rounded p-1 pb-0",
    {
      "pb-0": !isInput,
      "pb-[1px]": isInput
    }
  );

  return (
    <RadioGroup.Item
      key={id}
      value={value}
      className={radioItemClasses}
    >
      <div className={iconOverlayClasses}>
        <div className="w-[127px]">{TEMPLATE_ICONS[icon]}</div>
        {isInput ? (
          <input
            type="text"
            tabIndex={0}
            maxLength={200}
            className="border rounded focus:outline focus:outline-2 focus:outline-blue-600 mt-2 text-[0.9375rem] font-normal w-[131px] -mx-4"
            value={as.value}
            onChange={as.onChange}
          />
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="mt-2 w-[131px] -mx-[2px] truncate text-[0.9375rem] font-normal group-data-[state=checked]:font-bold px-1"
                >
                  {name}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={4}>
                {name}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

        )}
      </div>
    </RadioGroup.Item>
  );
}

function TemplateCategory({ title, action, children }: TemplateCategoryProps) {
  return <section id={title}>
    <div className="flex items-baseline justify-between mb-2">
      <Typography component="h2">
        <span className="text-lg font-bold">{title}</span>
      </Typography>
      {action}
    </div>
    <div className="flex gap-6 flex-wrap">
      {children}
    </div>
  </section>;
}

export function TemplateSelection({ defaultValue, children, onChange, disabled = false, value = "" }: TemplateSelectionProps) {
  const contextValue: TemplateSelectionProps = {
    disabled,
    defaultValue,
    children,
    onChange
  };

  return (
    <RadioGroupProvider value={contextValue}>
      <RadioGroup.Root
        name="template-selection"
        defaultValue={defaultValue}
        className="flex flex-col ml-4 mr-4"
        aria-label="Choose a template"
        onValueChange={onChange}
        value={value}
        disabled={disabled}
      >
        {Array.isArray(children) ? children.map((child, index) =>
          <div key={index} className={index !== children.length - 1 ? "mb-8" : "mb-0"}>
            {child}
          </div>) : children}
      </RadioGroup.Root>
    </RadioGroupProvider>

  );
}

TemplateSelection.Item = TemplateItem;
TemplateSelection.Category = TemplateCategory;

export default TemplateSelection;
