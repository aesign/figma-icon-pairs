import { PLUGIN, UI } from "@common/networkSides";
import { PLUGIN_CHANNEL } from "@plugin/plugin.network";
import { Networker } from "monorepo-networker";

async function bootstrap() {
  Networker.initialize(PLUGIN, PLUGIN_CHANNEL);

  figma.showUI(__html__, {
    width: 320,
    height: 660,
    themeColors: true,
  });

  console.log("Bootstrapped @", Networker.getCurrentSide().name);
}

bootstrap();
