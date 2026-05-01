import {defineConfig} from "sourcey";

export default defineConfig({
                                name:       "REST API",
                                theme:      {
                                    preset: "default",
                                    colors: {primary: "#f46023", light: "#f46023", dark: "#f46023"},
                                    fonts:  {sans: "Fira Sans", mono: "Ligconsolata Extended"},
                                    layout: {sidebar: "16rem", content: "48rem"},
                                    css:    ["./custom-style-rest.css"]
                                },
                                navigation: {
                                    tabs: [
                                        {
                                            tab:     "API Reference",
                                            slug:    "api",
                                            openapi: "./REST.json"
                                        }
                                    ]
                                }
                            });
