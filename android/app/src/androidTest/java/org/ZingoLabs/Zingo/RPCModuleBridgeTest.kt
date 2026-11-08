package org.ZingoLabs.ZingoDelegator

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.PromiseImpl
import com.facebook.react.bridge.ReactMethod
import com.google.common.truth.Truth.assertThat
import java.lang.reflect.Method
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import org.json.JSONObject
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import org.junit.experimental.categories.Category
import org.junit.runner.RunWith

private const val SERVER_URI = "http://10.0.2.2:20000"
private const val CHAIN_HINT = "main"
private const val PERFORMANCE_LEVEL = "Medium"
private const val MIN_CONFIRMATIONS = "1"
private const val PROMISE_TIMEOUT_SECONDS = 120L

@Category(OfflineTest::class)
@RunWith(AndroidJUnit4::class)
class RPCModuleBridgeTest {
    private fun freshProcessModule(): RPCModule = RPCModule(null)

    private fun exportedMethod(module: RPCModule, name: String): Method =
        module.javaClass.methods.firstOrNull {
            it.name == name && it.isAnnotationPresent(ReactMethod::class.java)
        } ?: run {
            fail("RPCModule does not export '$name' to JavaScript")
            throw IllegalStateException()
        }

    private fun callFromJs(module: RPCModule, name: String, vararg args: String): Any? {
        val latch = CountDownLatch(1)
        var resolved: Any? = null
        var rejected: Any? = null
        val promise: Promise = PromiseImpl(
            { values -> resolved = values.firstOrNull(); latch.countDown() },
            { values -> rejected = values.toList(); latch.countDown() },
        )
        exportedMethod(module, name).invoke(module, *args, promise)
        assertThat(latch.await(PROMISE_TIMEOUT_SECONDS, TimeUnit.SECONDS)).isTrue()
        assertThat(rejected).isNull()
        return resolved
    }

    @Before
    fun removeWallet() {
        callFromJs(freshProcessModule(), "deleteExistingWallet")
    }

    @Test
    fun coldStartReopensTheWalletThroughTheBridge() {
        val firstLaunch = freshProcessModule()
        assertThat(callFromJs(firstLaunch, "walletExists")).isEqualTo(false)

        val created = callFromJs(
            firstLaunch, "createNewWallet",
            SERVER_URI, CHAIN_HINT, PERFORMANCE_LEVEL, MIN_CONFIRMATIONS,
        ) as String
        assertThat(created.lowercase()).doesNotContain("error")
        val createdSeed = JSONObject(created)
        assertThat(callFromJs(firstLaunch, "walletExists")).isEqualTo(true)

        val coldStart = freshProcessModule()
        assertThat(callFromJs(coldStart, "walletExists")).isEqualTo(true)
        val reopened = callFromJs(
            coldStart, "loadExistingWallet",
            SERVER_URI, CHAIN_HINT, PERFORMANCE_LEVEL, MIN_CONFIRMATIONS,
        ) as String
        assertThat(reopened.lowercase()).doesNotContain("error")
        assertThat(JSONObject(reopened).toString()).isEqualTo(createdSeed.toString())
    }
}
