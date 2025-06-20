import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Typography from "@components/Typography";
import { cn } from "@/lib/utils";

interface AppRadioGroupProps {
  items: Array<{
    label: string | React.ReactNode;
    value: string;
    icon?: React.ReactNode;
    className?: string;
    description?: string | React.ReactNode;
  }>;
  variant?: "default" | "icon";
  onValueChange: (value: string) => void;
  value?: string;
  className?: string;
  disabled?: boolean;
  itemClassName?: string;
}

const AppRadioGroup = ({
  items,
  variant = "default",
  onValueChange,
  value,
  className,
  disabled,
  itemClassName,
}: AppRadioGroupProps) => {
  const isIcon = variant === "icon";

  return (
    <RadioGroup
      onValueChange={onValueChange}
      value={value}
      className={className}
      disabled={disabled}
    >
      {items.map((item) => (
        <div key={item.value} className={cn("flex items-start gap-2", itemClassName)}>
          <RadioGroupItem
            value={item.value}
            id={item.value}
            hidden={isIcon}
          />
          <div className="flex flex-col">
            <Typography component="label" htmlFor={item.value} className={item.className ?? ""}>
              {isIcon ? (
                <div className={cn(
                  "flex items-center justify-center",
                  { selectedStyle: value === item.value }
                )}>
                  {item.icon}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {item.icon}
                  {item.label}
                </div>
              )}
            </Typography>
            {item.description && (
              <div className="text-[13px] text-muted-foreground mt-1">
                {item.description}
              </div>
            )}
          </div>
        </div>
      ))}
    </RadioGroup>
  );
};

export default AppRadioGroup;