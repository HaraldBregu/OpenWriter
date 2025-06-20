interface ILayoutShapeText{
    layout: string
}

const LayoutShapeText = ({layout}:ILayoutShapeText) =>(
    <div className={`w-[281px] h-[398px] p-4 border border-secondary[85] flex ${layout==='vertical-vertical' && "flex-row gap-3"}`}>
      <div className={`${layout==='vertical-horizontal' ? "w-[249px]" : "w-[120px]"} h-[366px] bg-primary-foreground`}/>
      {layout==='vertical-vertical' && <div className={`w-[120px] h-[366px] bg-primary-foreground`}/> }
    </div>
  );



export default LayoutShapeText