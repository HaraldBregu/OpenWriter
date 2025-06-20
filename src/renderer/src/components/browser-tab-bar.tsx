import { AnimatePresence, motion, Reorder } from 'framer-motion'
import PlusSimple from './icons/PlusSimple'
import Close from './icons/Close'
import { cn } from '@/lib/utils'
import Unlocked from './icons/Unlocked'
import Button from './ui/button'
import ViewMode from './icons/ViewMode'
import Notifications from './icons/Notifications'
import { memo, useCallback } from 'react'

interface Props {
  item: TabInfo
  isSelected: boolean
  onClick: () => void
  onRemove: () => void
}

const BrowserTab = ({ item, onClick, onRemove, isSelected }: Props) => {

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.button === 1) {
      event.preventDefault();
      onRemove();
    } else {
      onClick();
    }
  }, [])

  const getTitle = useCallback((item: TabInfo) => {
    return item.changed ? item.name + ' *' : item.name
  }, [])

  return (
    <Reorder.Item
      value={item}
      id={item.id}
      initial={{
        opacity: 1,
        y: 30
      }}
      animate={{
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.1,
          ease: 'easeInOut'
        }
      }}
      exit={{
        opacity: 0,
        y: 20,
        transition: {
          duration: 0.15
        }
      }}
      whileDrag={{
        transition: {
          ease: 'easeInOut'
        }
      }}
      className={cn(
        'rounded-t-md border-t border-l border-r',
        'titlebar-button',
        'relative cursor-pointer flex items-center overflow-hidden select-none',
        "mr-1 h-[30px] min-w-[10px] max-w-[180px] flex-1",
        isSelected
          ? 'selected bg-background z-[60] border-border'
          : 'bg-muted border-b border-border z-[70]',
      )}
      onPointerDown={handleClick}
    >
      <motion.div className='flex flex-row items-center h-full w-full border-b border-border px-2'>
        <motion.div
          layout
          className="flex align-center items-center mr-1 flex-shrink-0"
        >
          <Unlocked className={cn("w-4 h-4")} />
        </motion.div>
        <motion.span
          style={{
            maskImage: 'linear-gradient(to left, transparent 30px, #fff 60px)',
            WebkitMaskImage: 'linear-gradient(to left, transparent 30px, #fff 60px)',
          }}
          className={cn(
            `text-xs text-left flex-shrink flex-grow leading-[18px] whitespace-nowrap block min-w-0 pr-[30px]`,
            isSelected ? 'text-foreground' : 'text-muted-foreground'
          )}
          layout="position"
        >
          {isSelected
            ? <strong>{getTitle(item)}</strong>
            : getTitle(item)}
        </motion.span>
        <motion.div
          layout
          className="absolute top-0 bottom-0 right-[0px] flex align-center items-center justify-end flex-shrink-0 pr-2"
        >
          <motion.button
            onPointerDown={(event) => {
              event.stopPropagation()
              onRemove()
            }}
            initial={false}
            animate={{
              backgroundColor: 'transparent'
            }}
            whileHover={{
              backgroundColor: 'hsl(var(--accent))',
              scale: 1.1,
              transition: { duration: 0.2 }
            }}
            className="rounded-full p-[1px]"
            children={<Close className={cn("w-4 h-4")} />}
          />
        </motion.div>
      </motion.div>
    </Reorder.Item>
  )
}

const BrowserTabMemo = memo(BrowserTab)

interface BrowserTabBarProps {
  tabs: TabInfo[]
  selectedTab: TabInfo | null
  onAdd: () => void
  onSelect: (tab: TabInfo) => void
  onRemove: (tab: TabInfo) => void
  onReorder: (tabs: TabInfo[]) => void
}

const BrowserTabBar = ({
  tabs,
  selectedTab,
  onAdd,
  onSelect,
  onRemove,
  onReorder,
}: BrowserTabBarProps) => {
  return (
    <div className="h-[32px] w-full flex flex-row titlebar justify-end border-t relative bg-background">
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-border pointer-events-none"></div>
      <div className="flex flex-row items-start w-full overflow-hidden">
        <div className="w-full h-full">
          <div className="flex flex-row w-full flex-grow px-2 bg-muted">
            <div className="flex flex-row w-full justify-between items-end pr-[10px] h-full">
              <div className="flex-1 min-w-0">
                <Reorder.Group
                  as="ul"
                  axis="x"
                  onReorder={onReorder}
                  className="flex-row flex-nowrap flex justify-start items-end h-full w-full border-b border-border"
                  values={tabs}
                >
                  <AnimatePresence initial={false}>
                    {tabs.map((item) => (
                      <BrowserTabMemo
                        key={item.id}
                        item={item}
                        isSelected={selectedTab?.id === item.id}
                        onClick={() => onSelect(item)}
                        onRemove={() => {
                          onRemove(item)
                          if (selectedTab?.id === item.id) {
                            const currentIndex = tabs.findIndex(tab => tab.id === item.id);
                            if (tabs.length > 1) {
                              if (currentIndex < tabs.length - 1) {
                                onSelect(tabs[currentIndex + 1]);
                              }
                              else if (currentIndex > 0) {
                                onSelect(tabs[currentIndex - 1]);
                              }
                            }
                          }
                        }}
                      />
                    ))}
                    <div className="flex items-center h-[32px]">
                      <motion.button
                        className="w-[24px] h-[24px] flex items-center justify-center hover:bg-accent rounded-full transition-all duration-300"
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onAdd()}
                        children={<PlusSimple className="w-4 h-4" color="currentColor" />}
                      />
                    </div>
                  </AnimatePresence>
                </Reorder.Group>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 ml-8">
                <div className="flex items-center h-[32px]">
                  <Button
                    intent="secondary"
                    variant="icon"
                    size="iconSm"
                    icon={<ViewMode className="w-4 h-4" />}
                    className="w-[24px] h-[24px] flex items-center justify-center"
                  />
                </div>
                <div className="flex items-center h-[32px]">
                  <Button
                    intent="secondary"
                    variant="icon"
                    size="iconSm"
                    icon={<Notifications className="w-4 h-4" />}
                    className="w-[24px] h-[24px] flex items-center justify-center"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(BrowserTabBar)
