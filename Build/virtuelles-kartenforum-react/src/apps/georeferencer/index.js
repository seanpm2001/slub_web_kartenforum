/**
 * Created by nicolas.looschen@pikobytes.de on 16.09.21.
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE.txt', which is part of this source code package.
 */
import React from "react";
import ReactDOM from "react-dom";
import settingsProvider from "../../SettingsProvider";
import AppGeoreferencer from "./GeoreferencerApp";

export const SettingsProvider = settingsProvider;

export function renderGeoreferenceApp(element) {
    ReactDOM.render(<AppGeoreferencer />, element);
}
