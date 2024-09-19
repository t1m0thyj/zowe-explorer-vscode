/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 *
 */

import * as fs from "fs";
import * as path from "path";
import { AfterAll, Then, When } from "@cucumber/cucumber";
import { paneDivForTree } from "../../../../__common__/shared.wdio";
import { TreeItem } from "wdio-vscode-service";
import quickPick from "../../../../__pageobjects__/QuickPick";
import { Key } from "webdriverio";

const USER_CONFIG_FILE = path.join(process.env.ZOWE_CLI_HOME, "zowe.config.user.json");

AfterAll(() => {
    fs.rmSync(USER_CONFIG_FILE, { force: true });
});
When(/a user who has profile with (.*) auth in team config/, function (authType: string) {
    this.authType = authType;
    const testConfig = {
        $schema: "./zowe.schema.json",
        profiles: {
            [`zosmf_${authType}`]: {
                type: "zosmf",
                properties: {},
                secure: [],
            },
        },
        defaults: {
            zosmf: `zosmf_${authType}`,
        },
    };
    if (authType === "basic") {
        testConfig.profiles.zosmf_basic.secure.push("user", "password");
    } else if (authType === "token") {
        testConfig.profiles.zosmf_token.secure.push("tokenValue");
        // } else if (authType === "token-base") {
        //     testConfig.profiles.base = {
        //         type: "base",
        //         properties: {
        //             host: "localhost",
        //             rejectUnauthorized: false,
        //         },
        //         secure: ["tokenValue"],
        //     };
        //     (testConfig.defaults as any).base = "base";
    }
    fs.writeFileSync(USER_CONFIG_FILE, JSON.stringify(testConfig, null, 2));
});
When("the user has a profile in their Data Sets tree", async function () {
    this.treePane = await paneDivForTree("Data Sets");
    this.profileNode = (await this.treePane.getVisibleItems()).pop() as TreeItem;
    await expect(this.profileNode).toBeDefined();
    await expect(await this.profileNode.getLabel()).toContain(this.authType);
});
When("a user clicks search button for the profile", async function () {
    await this.profileNode.elem.moveTo();
    const actionButtons = await this.profileNode.getActionButtons();

    // Locate and select the search button on the profile node
    const searchButton = actionButtons[actionButtons.length - 1];
    await expect(searchButton.elem).toBeDefined();
    await searchButton.elem.click();
});
Then(/the user will be prompted for (.*) credentials/, async function (authType: string) {
    if (authType === "basic") {
        const inputBox = await $('.input[aria-describedby="quickInput_message"]');
        await expect(inputBox).toBeClickable();
    } else if (authType === "token") {
        await browser.waitUntil((): Promise<boolean> => quickPick.isClickable());
        const userPasswordItem = await quickPick.findItemByIndex(0);
        await expect(userPasswordItem).toBeClickable();
    }
    await browser.keys(Key.Escape);
});
Then("the profile node will be marked as inactive", async function () {
    await browser.waitUntil(() => this.profileNode.isExpanded());
    console.log(this.profileNode);
});
