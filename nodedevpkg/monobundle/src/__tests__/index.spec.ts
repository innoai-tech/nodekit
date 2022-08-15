import {test} from "vitest"
import {getBuildTargets} from "../getTarget"

test("#getBuildTargets", () => {
    console.log(getBuildTargets("defaults"))
})