// Kept as the historical name for the overlay primitive. It now delegates to
// Sheet, which means every existing dialog turns into a bottom sheet on a
// phone and stays a centered glass card on wider screens.
export { Sheet as Modal, SheetHeader as ModalHeader } from '~/components/ui/Sheet';
