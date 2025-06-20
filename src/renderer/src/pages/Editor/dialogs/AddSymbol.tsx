"use client";

import { memo, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import cn from "@/utils/classNames";

const AddSymbolDialog: React.FC<{ isOpen: boolean; onCancel: () => void, onApply: (character: number) => void }> = ({ isOpen, onCancel, onApply }) => {
    const { t } = useTranslation();

    const [fonts, setFonts] = useState<string[]>([]);
    const [subsets, setSubsets] = useState<Subset[]>([]);

    const [currentTab, setCurrentTab] = useState<string>('symbols');
    const [selectedFont, setSelectedFont] = useState('');
    const [selectedSubset, setSelectedSubset] = useState('');
    const [symbols, setSymbols] = useState<CharacterSet>([]);
    const [filterSymbols, setFilterSymbols] = useState<CharacterSet>([]);
    const [selectedSymbol, setSelectedSymbol] = useState<number>(0);
    const [selectedSpecialCharacter, setSelectedSpecialCharacter] = useState<number>(0);
    const [configuredSpecialCharactersList, setConfiguredSpecialCharactersList] = useState<CharacterConfiguration[]>([]);

    const ButtonMemo = memo(Button);

    const handleFontChange = (fontName) => {
        setSelectedFont(fontName);
        setSymbols([]);
        setSelectedSymbol(0);
        setSelectedSpecialCharacter(0);
        window.system.getSymbols(fontName).then(setSymbols);
    }

    const handleSubsetChange = (subsetIndex = selectedSubset) => {
        let filteredCharacters = symbols;
        setSelectedSubset(subsetIndex);
        if (subsetIndex !== '') {
            const subset = subsets[subsetIndex];
            filteredCharacters = filteredCharacters.filter(character => character.code >= subset.start && character.code <= subset.end);
        }
        setFilterSymbols(filteredCharacters)
    }

    const handleInsertCharacter = () => {
        console.log(selectedSymbol);
        onApply(currentTab === 'symbols' ? selectedSymbol : selectedSpecialCharacter);
    }

    useEffect(() => {
        handleSubsetChange('0');
    }, [symbols]);

    useEffect(() => {
        if (!isOpen) {
            handleFontChange(fonts[0]);
        }
    }, [isOpen]);

    useEffect(() => {
        window.system.getFonts().then((fonts) => {
            setFonts(fonts);
            handleFontChange(fonts[0]);
        });
        window.system.getSubsets().then(setSubsets);
        window.system.getConfiguredSpcialCharactersList().then(setConfiguredSpecialCharactersList);
    }, []);

    return (
        <Modal
            key={"add-symbol-modal"}
            isOpen={isOpen}
            onOpenChange={onCancel}
            title={t('toolbar.modalTitle')}
            className="max-w-[752px] h-[90%] max-h-[521px] overflow-hidden gap-0 flex flex-col"
            contentClassName="flex flex-col gap-8 px-4 pt-4 pb-10 overflow-hidden flex-1"
            footerClassName='h-[auto] py-4'
            headerClassName="py-2 h-12 leading-[18px] items-center justify-center"
            showCloseIcon={true}
            actions={[
                <Button key="cancel" className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 w-24" size="mini" intent={"secondary"} variant={"tonal"} onClick={onCancel}>{t('buttons.cancel')}</Button>,
                <Button key="save" disabled={!selectedSymbol} className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 w-24" size="mini" intent={"primary"} onClick={handleInsertCharacter}>
                    {t('buttons.insert')}
                </Button>
            ]}
        >
            <Tabs value={currentTab} defaultValue="symbols" className="w-full h-full overflow-hidden">
                <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger onClick={() => setCurrentTab('symbols')} className="border-grey-50" value="symbols">{t('symbols.label')}</TabsTrigger>
                    <TabsTrigger onClick={() => setCurrentTab('special')} className="border-grey-50" value="special">{t('symbols.special')}</TabsTrigger>
                </TabsList>

                <TabsContent value='symbols' className="max-h-[calc(100%-32px)] overflow-hidden flex flex-col focus-visible:ring-0 focus-visible:ring-offset-0">
                    <div className="mt-4 flex gap-4">
                        <div className="flex flex-col gap-1">
                            <Label className="text-secondary-30 text-[13px] font-semibold" htmlFor="fontList">
                                {t('symbols.font')}
                            </Label>
                            <Select key="fontList" value={selectedFont} onValueChange={handleFontChange}>
                                <SelectTrigger id="fontList" className="w-[200px] focus:ring-0 focus:ring-offset-0 focus:border-grey-70">
                                    <SelectValue placeholder="Font" />
                                </SelectTrigger>
                                <SelectContent>
                                    {fonts.map(font => (
                                        <SelectItem key={font} value={font}>
                                            {font}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <Label className="text-secondary-30 text-[13px] font-semibold" htmlFor="subsetList">
                                {t('symbols.subset')}
                            </Label>
                            <Select key="subsetList" value={selectedSubset} onValueChange={handleSubsetChange}>
                                <SelectTrigger id="subsetList" className="w-[200px] focus:ring-0 focus:ring-offset-0 focus:border-grey-70">
                                    <SelectValue placeholder="-" />
                                </SelectTrigger>
                                <SelectContent>
                                    {subsets.map((s, index) => (
                                        <SelectItem key={s.name} value={`${index}`}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Symbols Grid */}
                    <div className="mt-6 flex flex-wrap overflow-auto flex-1">
                        {filterSymbols.map(({ code, name }) => (
                            <ButtonMemo
                                key={code}
                                intent={selectedSymbol === code ? "primary" : "secondary"}
                                variant={selectedSymbol === code ? "filled": "border"}
                                className="h-[50px] w-[50px] px-[15px] py-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
                                onClick={() => setSelectedSymbol(code)}
                                tooltip={name}
                            >
                                {String.fromCharCode(code)}
                            </ButtonMemo>
                        ))}
                    </div>
                </TabsContent>
                <TabsContent value="special">
                    <Table>
                        <TableHeader>
                            <TableRow className='border-t text-[11px] text-grey-10 leading-5'>
                                <TableHead className="w-[33%] h-auto font-bold">{t('symbols.symbol')}</TableHead>
                                <TableHead className="w-[33%] h-auto font-bold">{t('symbols.character')}</TableHead>
                                <TableHead className="w-[33%] h-auto font-bold">{t('symbols.keyboardShortcut')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {configuredSpecialCharactersList.map((char, index) => (
                                <TableRow className={cn('border-none cursor-pointer hover:bg-primary focus:bg-primary hover:text-white focus:text-white text-[13px] leading-[15px] text-grey-10', selectedSpecialCharacter === char.code ? "bg-primary" : "")} key={index} onClick={() => setSelectedSpecialCharacter(char.code)}>
                                    <TableCell className={cn('rounded-tl-[5px] rounded-bl-[5px]', selectedSpecialCharacter === char.code ? "text-white" : "")}>{String.fromCharCode(char.code)}</TableCell>
                                    <TableCell className={cn('', selectedSpecialCharacter === char.code ? "text-white" : "")}>{char.character}</TableCell>
                                    <TableCell className={cn('rounded-tr-[5px] rounded-br-[5px]', selectedSpecialCharacter === char.code ? "text-white" : "")}>{char.shortcut}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TabsContent>
            </Tabs>
        </Modal>
    );
}

export default AddSymbolDialog;