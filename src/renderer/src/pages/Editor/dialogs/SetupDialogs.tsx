import { memo, useCallback, useMemo } from 'react'
import { useEditor } from '../hooks/useEditor'
import {
  setFontFamilySymbols,
  setSiglumListFromFile,
  setSiglumSetupDialogVisible
} from '../provider'
import { SiglumSetup } from './SiglumSetup'

export const SetupDialogs = () => {
  const [state, dispatch] = useEditor()

  const siglumSetupDialogVisible = useMemo(
    () => state.siglumSetupDialogVisible,
    [state.siglumSetupDialogVisible]
  )
  const siglumList = useMemo(() => state.siglumList, [state.siglumList])
  const fontFamilyList = useMemo(() => state.fontFamilyList, [state.fontFamilyList])
  const fontFamilySymbols = useMemo(() => state.fontFamilySymbols, [state.fontFamilySymbols])

  const handleImportSiglum = useCallback(async () => {
    const importedSiglum = await window?.doc?.importSiglumList()
    if (!importedSiglum) return

    console.log('siglumList', siglumList)

    const hasSameSiglum = importedSiglum.some((item) =>
      siglumList.some((siglum) => siglum.siglum.value === item.siglum.value)
    )

    // @TODO: manage the duplicate of symbols when importing a siglum list
    if (hasSameSiglum) {
      window?.system?.showMessageBox(
        `The Siglum ${importedSiglum[0].siglum.value} is already present in the document. Do you want to replace it?`
      )

      // “Yes”: with which the user will proceed with overwriting the Siglum with the same name, replacing the Siglum present in the document with the one uploaded.
      // “No”: the Siglum present in the document will not be replaced and therefore the Siglum present in the uploaded file will be discarded.
      // “Keep both”: allows you to keep both versions of the Siglum in the list, with the difference that the Siglum imported from the file will have a sequence number at the end of its name (e.g. A_#1).
      // Assume that we have Siglum A in the document and upload a file containing, among others, another Siglum A.

      // In this scenario, if the user chooses to keep both versions of the Siglum in the document by pressing the “Keep Both” button,
      // we will have Siglum A (the one that was already in the document) and Siglum A_1,
      // corresponding to the Siglum A present in the file imported by the user, in the list of Siglums.

      return
    }

    dispatch(setSiglumListFromFile(importedSiglum))

    // console.log("siglumList", siglumList)
    // window.system.showMessageBox("Import Siglum")
  }, [siglumList])

  return (
    <>
      <SiglumSetup
        open={siglumSetupDialogVisible}
        onOpenChange={(open) => {
          dispatch(setSiglumSetupDialogVisible(open))
        }}
        fontFamilyList={fontFamilyList}
        fontFamilySymbols={fontFamilySymbols}
        onSelectFontFamily={async (fontFamily) => {
          const symbols = await window?.system?.getSymbols(fontFamily)
          if (!symbols) return

          dispatch(setFontFamilySymbols(symbols))
        }}
        onImportSiglum={handleImportSiglum}
        onExportSiglumList={() => {
          window?.doc?.exportSiglumList(state.siglumList)
        }}
      />
    </>
  )
}

export default memo(SetupDialogs)
