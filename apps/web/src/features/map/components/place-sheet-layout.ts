export function getPlaceSheetLayoutClassNames(hasSelectedPlace: boolean) {
  if (hasSelectedPlace) {
    return {
      drawer: 'bottom-0 max-h-dvh',
      scroller: 'h-dvh pb-[calc(1.25rem+env(safe-area-inset-bottom))]',
    };
  }

  return {
    drawer:
      'bottom-[calc(60px+env(safe-area-inset-bottom))] max-h-[calc(100dvh-60px-env(safe-area-inset-bottom))]',
    scroller: 'h-[calc(100dvh-60px-env(safe-area-inset-bottom))] pb-5',
  };
}
