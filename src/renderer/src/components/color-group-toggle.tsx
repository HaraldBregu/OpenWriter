import { clsx } from "clsx";
import Typogaphy from "@/components/Typography";
import * as ToggleGroup from "@radix-ui/react-toggle-group";

const COLORS = [
  { value: '#ffffff', label: 'White' },
  { value: '#ffa500', label: 'Orange' },
  { value: '#ffff00', label: 'Yellow' },
  { value: '#00ff00', label: 'Lime' },
  { value: '#00ffff', label: 'Cyan' },
  { value: '#4682b4', label: 'Steel Blue' },
  { value: '#0000ff', label: 'Blue' },
  { value: '#8000ff', label: 'Purple' },
  { value: '#000000', label: 'Black' }
];

const COLOR_VALUES = COLORS.map(c => c.value.toLowerCase());

function ColorToggleGroup({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const normalized = value?.toLowerCase();
  const isPredefined = COLOR_VALUES.includes(normalized);
  const activeToggleValue = isPredefined ? normalized : (value ? 'custom' : '');

  return (
    <div>
      <Typogaphy component="p" className="ml-2 mb-1 text-[12px] font-semibold">
        Text Color
      </Typogaphy>

      <ToggleGroup.Root
        type="single"
        value={activeToggleValue}
        onValueChange={(val) => {
          if (val === 'custom') return;
          if (val) onChange(val);
        }}
        className="flex gap-2 flex-wrap p-1"
      >
        {COLORS.map((color) => (
          <ToggleGroup.Item
            key={color.value}
            value={color.value.toLowerCase()}
            className={clsx(
              'w-[40px] h-[40px] border border-gray-300 rounded overflow-hidden',
              activeToggleValue === color.value.toLowerCase() && 'outline outline-[3px] outline-blue-600'
            )}
            style={{
              background: color.value,
              borderColor: color.value === '#ffffff' ? '#C2C7CF' : undefined,
            }}
            aria-label={`Color ${color.label}`}
          />
        ))}

        <ToggleGroup.Item
          value="custom"
          className={clsx(
            'relative w-[40px] h-[40px] border border-gray-300 rounded overflow-hidden',
            activeToggleValue === 'custom' && 'outline outline-[3px] outline-blue-600'
          )}
          style={{
            background: !value || isPredefined
              ? 'conic-gradient(red, orange, yellow, lime, cyan, blue, indigo, violet, red)'
              : value,
            borderColor: '#C2C7CF',
          }}
          aria-label="Custom Color"
        >
          {(!isPredefined && value) && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
                borderRadius: '20px',
                pointerEvents: 'none',
              }}
            />
          )}
          <input
            type="color"
            value={isPredefined ? '' : value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </ToggleGroup.Item>
      </ToggleGroup.Root>
    </div>
  );
}

export default ColorToggleGroup;
