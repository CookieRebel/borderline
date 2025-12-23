import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import { createRoot } from "react-dom/client";
import AppRoot from "./AppRoot";

export function mount(el: Element) {
    createRoot(el).render(<AppRoot />);
}
