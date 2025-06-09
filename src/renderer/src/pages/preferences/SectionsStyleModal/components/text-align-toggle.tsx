import AlignLeft from "@/components/icons/AlignLeft";
import AlignCenter from "@/components/icons/AlignCenter";
import AlignRight from "@/components/icons/AlignRight";
import AlignJustify from "@/components/icons/AlignJustify";
import clsx from "clsx";
import * as ToggleGroup from '@radix-ui/react-toggle-group';

function TextAlignToggle({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const options = [
    { value: "left", label: "Align left", Icon: AlignLeft },
    { value: "center", label: "Align center", Icon: AlignCenter },
    { value: "right", label: "Align right", Icon: AlignRight },
    { value: "justify", label: "Justify", Icon: AlignJustify },
  ];

  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(val) => val && onChange(val)}
      className="flex justify-between border rounded-md w-[120px] p-[5px]"
    >
      {options.map(({ value: alignValue, label, Icon }) => (
        <ToggleGroup.Item
          key={alignValue}
          value={alignValue}
          aria-label={label}
          className={clsx(
            'rounded h-[24px] w-[24px] flex items-center justify-center transition-colors',
            value === alignValue ? 'bg-secondary' : 'hover:bg-gray-100'
          )}
        >
          <Icon
            className="h-[20px] w-[20px]"
            color={value === alignValue ? "white" : "currentColor"}
          />
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}

export default TextAlignToggle;
