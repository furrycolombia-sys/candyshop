/**
 * Orders a seller acts on, in two views.
 *
 * `ReceivedOrdersPage` lists the orders placed with the seller directly.
 * `AssignedOrdersPage` lists the subset delegated to the signed-in delegate.
 * Both are the same domain seen through a different filter, which is why they
 * share this feature's card, actions, types, and queries rather than sitting
 * in two features that import each other.
 */
export { AssignedOrdersPage } from "./presentation/pages/AssignedOrdersPage";
export { ReceivedOrdersPage } from "./presentation/pages/ReceivedOrdersPage";
