import { cn } from "@/lib/utils";
import { LayoutType } from "@/pages/editor/store/layout/layout.state";

export type TextPortionType = {
  title: string;
  columns: number;
  type: "text" | "apparatus";
  id: string;
};

const TextPortion = ({
  apparatus,
  showDetails,
  columns,
  additionalClassName,
}: {
  apparatus: TextPortionType;
  showDetails: boolean;
  columns: number[];
  additionalClassName?: string;
}) => (
  <>
    {showDetails && (
      <div
        className={`absolute h-[100%] inset-0 flex items-center justify-center pointer-events-none font-semibold`}
      >
        <div className="w-[8rem]">
          <p className={`${additionalClassName} ${apparatus.title.length > 15 && 'truncate'} text-center`}>{apparatus.title}</p>
        </div>
      </div>
    )}
    <div className="grow flex gap-2 h-full">
      {showDetails &&
        columns.map((j) => (
          <div
            key={j}
            className="w-full h-full grow border-2 border-secondary-90"
          />
        ))}
    </div>
  </>
);

const TextWithoutApparatus = ({
  layoutName,
  textDetails,
}: Pick<LayoutShapeProps, "textDetails" | "layoutName">) =>
  layoutName === "vertical-horizontal" ? (
    <div className="relative bg-secondary-95 w-full grow c-apparatus-container" />
  ) : (
    [...Array(textDetails.columns)].map((_, i) => (
      <div
        className="relative bg-secondary-95 w-full grow c-apparatus-container"
        key={i}
      />
    ))
  );
export interface LayoutShapeProps {
  layoutName: LayoutType;
  textDetails: TextPortionType;
  apparatusDetails: TextPortionType[];
  isSelected?: boolean;
  isReadonly?: boolean;
  className: string;
  showDetails?: boolean;
  variant: "big" | "small";
}

const LayoutShape = ({
  layoutName,
  isSelected,
  className,
  textDetails,
  apparatusDetails,
  showDetails,
  variant,
  isReadonly,
}: LayoutShapeProps) => {
  const variants = {
    small: "gap-[2px]",
    big: "gap-2",
  };
  const layouts = {
    "vertical-horizontal": `border flex flex-col [&>.c-apparatus]:flex-row`,
    "horizontal-horizontal": `border flex flex-col [&>.c-apparatus]:flex-col`,
    "vertical-vertical": `border flex flex-row [&>.c-apparatus]:flex-col`,
    "vertical-vertical-reverse": `border flex flex-row-reverse [&>.c-apparatus]:flex-col`,
  };

  const layoutShapeClass = cn(
    layouts[layoutName],
    { "border-primary border-2": isSelected },
    { "border-secondary": isReadonly && isSelected },
    className,
    variants[variant]
  );
  const apparatusClass = cn(" w-full grow flex c-apparatus", variants[variant]);

  const generateCustomArray = (elems: number) =>
    Array.from({ length: elems }, (_, i) => i);

  return (
    <div className={layoutShapeClass}>
      {apparatusDetails.length > 0 ? (
        <>
          <div className="relative bg-primary-95 w-full grow c-text-container">
            <TextPortion
              apparatus={textDetails}
              columns={generateCustomArray(textDetails.columns)}
              showDetails={!!showDetails}
            />
          </div>

          <div className={apparatusClass}>
            {apparatusDetails.map((apparatus) => (
              <div
                key={apparatus.id}
                className="relative bg-secondary-95 w-full grow c-apparatus-container"
              >
                <TextPortion
                  key={JSON.stringify(apparatus)}
                  apparatus={apparatus}
                  additionalClassName={
                    (apparatusDetails.length > 2 && layoutName === 'vertical-horizontal' && apparatus.title.length > 2)
                      ? "transform rotate-90 whitespace-nowrap overflow-visible p-2"
                      : "transform rotate-0 p-2 "
                  }
                  columns={generateCustomArray(apparatus.columns)}
                  showDetails={!!showDetails}
                />
              </div>
            ))}
          </div>
        </>
      ) : (
        <TextWithoutApparatus
          textDetails={textDetails}
          layoutName={layoutName}
        />
      )}
    </div>
  );
};

export default LayoutShape;
