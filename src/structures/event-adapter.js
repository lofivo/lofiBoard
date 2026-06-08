export const LINEAR_STRUCTURE_EVENT_TYPES = Object.freeze({
  ITEM_SELECT: "linear.item.select",
  ITEM_PRESS: "linear.item.press",
  ITEM_RELEASE: "linear.item.release",
});

export function createLinearStructureEventAdapter(dispatch) {
  return {
    onArrayItemSelect(payload) {
      dispatch({
        type: LINEAR_STRUCTURE_EVENT_TYPES.ITEM_SELECT,
        ...payload,
      });
    },
    onArrayItemPress(payload) {
      dispatch({
        type: LINEAR_STRUCTURE_EVENT_TYPES.ITEM_PRESS,
        ...payload,
      });
    },
    onArrayItemRelease(payload) {
      dispatch({
        type: LINEAR_STRUCTURE_EVENT_TYPES.ITEM_RELEASE,
        ...payload,
      });
    },
  };
}
