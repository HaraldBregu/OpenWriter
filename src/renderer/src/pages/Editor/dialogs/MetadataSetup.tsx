import { useTranslation } from "react-i18next";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCallback, useState } from "react";

const MetadataItem = ({ title, value }: { title: string, value: string }) => {
    return (
        <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-gray-600">{value}</p>
        </div>
    )
}

const MetadataView = () => {
    return (
        <div className="p-6 space-y-6 bg-white max-h-[70vh] overflow-y-auto">
                <MetadataItem title="License" value="-" />
                <MetadataItem title="Creation date" value="Fri, 15 Sep 2023 14:44:59 GMT" />
                <MetadataItem title="Last saved date" value="Fri, 15 Sep 2023 14:44:59 GMT" />
                <MetadataItem title="Title" value="Corpvs ivris canonici emendatvm et notis illvstratum" />
                <MetadataItem title="Subject" value="Indicibvs variis, et novis, & appendice Pavli Lanceloti [...] adauctum [...] Accesservnt novissimè loci commvnes [...].
                " />
                <MetadataItem title="Author" value="Anna Bianchi" />
                <MetadataItem title="Copyright Holder" value="-" />
                <MetadataItem title="Keywords" value="Marriage, God, Legislation, Corpus iuris canonici 1140-1582" />
                <MetadataItem title="Status" value="Draft" />
                <MetadataItem title="Template" value="Publisher X" />
                <MetadataItem title="Language" value="Latin" />
        </div>
    )
}

//@ts-ignore
const MetadataEdit = () => {
    return (
        <div>
            <DialogHeader className="relative flex flex-row items-center justify-center p-4 border-b border-gray-300 bg-gray-100">
                <div className="absolute left-4 flex space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <DialogTitle className="text-lg font-medium text-gray-900">Metadata</DialogTitle>
            </DialogHeader>


            {/* Content area */}
            <div className="p-6 space-y-6 bg-white max-h-[70vh] overflow-y-auto">
                <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">License</h3>
                    <p className="text-gray-600">-</p>
                </div>

                <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Creation date</h3>
                    <p className="text-gray-600">Fri, 15 Sep 2023 14:44:59 GMT</p>
                </div>

                <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Last saved date</h3>
                    <p className="text-gray-600">Fri, 15 Sep 2023 14:44:59 GMT</p>
                </div>

                <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Title</h3>
                    <p className="text-gray-600">Corpvs ivris canonici emendatvm et notis illvstratum</p>
                </div>

                <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Subject</h3>
                    <p className="text-gray-600">
                        Indicibvs variis, et novis, & appendice Pavli Lanceloti [...] adauctum [...] Accesservnt novissimè loci
                        commvnes [...].
                    </p>
                </div>

                <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Author</h3>
                    <p className="text-gray-600">Anna Bianchi</p>
                </div>

                <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Copyright Holder</h3>
                    <p className="text-gray-600">-</p>
                </div>

                <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Keywords</h3>
                    <p className="text-gray-600">Marriage, God, Legislation, Corpus iuris canonici 1140-1582</p>
                </div>

                <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Status</h3>
                    <p className="text-gray-600">Draft</p>
                </div>

                <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Template</h3>
                    <p className="text-gray-600">Publisher X</p>
                </div>

                <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Language</h3>
                    <p className="text-gray-600">Latin</p>
                </div>
            </div>

            {/* Footer */}
            {/* <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
                    <HelpCircle className="w-5 h-5" />
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6">Done</Button>
            </div> */}
        </div>
    )
}


interface MetadataSetupProps {
    onClose: () => void;
    onSave: (data: Metadata) => void;
    initialData?: Metadata;
}

export default function MetadataSetup({ onClose }: MetadataSetupProps) {
    const { t } = useTranslation();
    const [openedmodal, setopenmodal] = useState(true);

    //@ts-ignore
    const handleClose = useCallback(() => {
        setopenmodal(false);
        onClose();
    }, [onClose]);

    return (
        <Modal
            isOpen={openedmodal}
            title={t("sections_styles_dialog.title")}
            className="max-w-[880px] max-h-[90%] flex flex-col !m-2 !p-0"
            contentClassName="!p-0 my-[-15px] h-full"
            onOpenChange={() => { }}
            actions={[
                <Button
                    key="export-style"
                    className="w-24"
                    size="mini"
                    intent="primary"
                    variant="tonal"
                    onClick={() => { }}
                >
                    {t("sections_styles_dialog.export_style")}
                </Button>,
                <Button
                    key="done"
                    className="w-24"
                    size="mini"
                    intent="primary"
                    onClick={() => { }}
                >
                    {t("sections_styles_dialog.done")}
                </Button>
            ]}>
            <DialogContent className="max-w-2xl p-0 bg-gray-100 border-gray-300">
                <MetadataView />
            </DialogContent>
        </Modal>
    );
}

