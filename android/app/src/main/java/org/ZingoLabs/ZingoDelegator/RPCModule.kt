package org.ZingoLabs.ZingoDelegator

import android.content.Context
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import java.io.File
import org.ZingoLabs.ZingoDelegator.Constants.*
import kotlinx.coroutines.*
import org.json.JSONObject


class RPCModule internal constructor(private val reactContext: ReactApplicationContext?) : ReactContextBaseJavaModule(reactContext) {
    private val applicationContext: Context = reactContext?.applicationContext ?: MainApplication.getAppContext()!!

    override fun getName(): String {
        return "RPCModule"
    }

    private fun getDocumentDirectory(): String {
        return applicationContext.filesDir.absolutePath
    }

    fun fileExists(fileName: String): Boolean {
        val file = File(applicationContext.filesDir, fileName)
        return if (file.exists()) {
            Log.i("MAIN", "File $fileName exists")
            true
        } else {
            Log.i("MAIN", "File $fileName DOES NOT exist")
            false
        }
    }

    private fun writeFile(fileName: String, fileBytes: ByteArray) {
        val file = applicationContext.openFileOutput(fileName, Context.MODE_PRIVATE)
        file?.write(fileBytes)
        file?.close()
    }

    fun walletFileExists(): Boolean {
        return uniffi.zingo.walletExists(getDocumentDirectory())
    }

    @ReactMethod
    fun walletExists(promise: Promise) {
        promise.resolve(walletFileExists())
    }

    @ReactMethod
    fun walletBackupExists(promise: Promise) {
        promise.resolve(uniffi.zingo.walletBackupExists(getDocumentDirectory()))
    }

    fun saveWalletFile(): Boolean {
        return try {
            uniffi.zingo.initLogging()
            val resp = uniffi.zingo.saveWallet()
            if (resp.lowercase().startsWith(ErrorPrefix.value)) {
                Log.e("MAIN", "Error: [Native] Couldn't save the wallet. $resp")
                false
            } else {
                Log.i("MAIN", "[Native] wallet file written: $resp")
                true
            }
        } catch (e: Exception) {
            Log.e("MAIN", "Error: [Native] Unexpected error. Couldn't save the wallet. $e")
            false
        }
    }

    private fun saveWalletBackupFile(): Boolean {
        return try {
            val resp = uniffi.zingo.backupWallet(getDocumentDirectory())
            if (resp.lowercase().startsWith(ErrorPrefix.value)) {
                Log.e("MAIN", "Error: [Native] Couldn't save the wallet backup. $resp")
                false
            } else {
                true
            }
        } catch (e: Exception) {
            Log.e("MAIN", "Error: [Native] Unexpected error. Couldn't save the wallet backup", e)
            false
        }
    }

    fun saveBackgroundFile(json: String) {
        try {
            val fileBytes = json.toByteArray()
            Log.i("MAIN", "file background size: ${fileBytes.size} bytes")

            writeFile(BackgroundFileName.value, fileBytes)
        } catch (e: Exception) {
            Log.e("MAIN", "Error: [Native] Unexpected error. Couldn't save the background file")
        }
    }

    @ReactMethod
    fun createNewWallet(serveruri: String, chainhint: String, performancelevel: String, minconfirmations: String, promise: Promise) {
        try {
            uniffi.zingo.initLogging()

            val resp = uniffi.zingo.initNew(getDocumentDirectory(), serveruri, chainhint, performancelevel, minconfirmations.toUInt())

            promise.resolve(resp)
        } catch (e: Exception) {
            val errorMessage = "Error: [Native] create new wallet: ${e.localizedMessage}"
            Log.e("MAIN", errorMessage, e)
            promise.resolve(errorMessage)
        }
    }

    @ReactMethod
    fun restoreWalletFromSeed(seed: String, birthday: String, serveruri: String, chainhint: String, performancelevel: String, minconfirmations: String, promise: Promise) {
        try {
            uniffi.zingo.initLogging()

            val resp = uniffi.zingo.initFromSeed(getDocumentDirectory(), seed, birthday.toUInt(), serveruri, chainhint, performancelevel, minconfirmations.toUInt())

            promise.resolve(resp)
        } catch (e: Exception) {
            val errorMessage = "Error: [Native] restore wallet from seed: ${e.localizedMessage}"
            Log.e("MAIN", errorMessage, e)
            promise.resolve(errorMessage)
        }
    }

    @ReactMethod
    fun loadExistingWallet(serveruri: String, chainhint: String, performancelevel: String, minconfirmations: String, promise: Promise) {
        promise.resolve(loadExistingWalletNative(serveruri, chainhint, performancelevel, minconfirmations))
    }

    fun loadExistingWalletNative(serveruri: String, chainhint: String, performancelevel: String, minconfirmations: String): String {
        return try {
            uniffi.zingo.initLogging()

            uniffi.zingo.initFromFile(getDocumentDirectory(), serveruri, chainhint, performancelevel, minconfirmations.toUInt())
        } catch (e: Exception) {
            val errorMessage = "Error: [Native] load existing wallet: ${e.localizedMessage}"
            Log.e("MAIN", errorMessage, e)
            errorMessage
        }
    }

    @ReactMethod
    fun restoreExistingWalletBackup(promise: Promise) {
        try {
            val resp = uniffi.zingo.restoreWalletBackup(getDocumentDirectory())
            if (resp.lowercase().startsWith(ErrorPrefix.value)) {
                Log.e("MAIN", "Error: [Native] Couldn't restore the wallet backup. $resp")
                promise.resolve(false)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e("MAIN", "Error: [Native] Unexpected error, restoring the wallet backup", e)
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun deleteExistingWallet(promise: Promise) {
        try {
            val resp = uniffi.zingo.deleteWallet(getDocumentDirectory())
            if (resp.lowercase().startsWith(ErrorPrefix.value)) {
                Log.e("MAIN", "Error: [Native] Couldn't delete the wallet. $resp")
                promise.resolve(false)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e("MAIN", "Error: [Native] Unexpected error, deleting the wallet", e)
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun doSave(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = saveWalletFile()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] saving wallet: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun doSaveBackup(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = saveWalletBackupFile()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] saving wallet backup: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getLatestBlockServerInfo(serveruri: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getLatestBlockServer(serveruri)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] get latest block serveruri: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun discoverIndexers(network: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.discoverIndexers(network)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] discover indexers: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun probeIndexer(serveruri: String, network: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.probeIndexer(serveruri, network)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] probe indexer: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun selectBestIndexer(network: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.selectBestIndexer(network)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] select best indexer: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getLatestBlockWalletInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getLatestBlockWallet()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] get latest block wallet: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getDonationAddress(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getDeveloperDonationAddress()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] get donation address: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getZenniesDonationAddress(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getZenniesForZingoDonationAddress()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] get Zennies donation address: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getValueTransfersList(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getValueTransfers()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] get value transfers list: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun setCryptoDefaultProvider(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.setCryptoDefaultProviderToRing()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] setting crypto default provider: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun pollSyncInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.pollSync()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Throwable) {
                val detail = e.message
                                ?.takeIf { it.isNotBlank() }
                                ?: e.localizedMessage
                                    ?.takeIf { it.isNotBlank() }
                                ?: e.toString()
                val errorMessage = "Error: [Native] sync poll info: $detail"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun runSyncProcess(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.runSync()

                if (!resp.lowercase().startsWith(ErrorPrefix.value)) {
                    val save = saveWalletFile()
                    if (!save) {
                        val errorMessage = "Error: [Native] sync run process: Couldn't save the wallet."
                        Log.e("MAIN", errorMessage)

                        withContext(Dispatchers.Main) {
                            promise.resolve(errorMessage)
                        }
                    }
                }

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] sync run process: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun pauseSyncProcess(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.pauseSync()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] sync pause process: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun statusSyncInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.statusSync()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] sync status info: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun runRescanProcess(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.runRescan()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] rescan run process: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun infoServerInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.infoServer()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] server info: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getSeedInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getSeed()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] seed: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getUfvkInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getUfvk()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] ufvk: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun changeServerProcess(serveruri: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.changeServer(serveruri)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] change serveruri: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun walletKindInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.walletKind()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] wallet kind: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun parseAddressInfo(address: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.parseAddress(address)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] parse address: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getVersionInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getVersion()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] version: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getBalanceInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getBalance()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] balance: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getTotalMemobytesToAddressInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getTotalMemobytesToAddress()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] memobyes to address: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getTotalValueToAddressInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getTotalValueToAddress()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] value to address: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getTotalSpendsToAddressInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getTotalSpendsToAddress()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] spends to address: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun zecPriceInfo(tor: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.zecPrice(tor)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] zec price: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getSpendableBalanceWithAddressInfo(address: String, zennies: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getSpendableBalanceWithAddress(address, zennies)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] spendable balance with address: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getSpendableBalanceTotalInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getSpendableBalanceTotal()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] spendable balance total: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun createTorClientProcess(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.createTorClient(getDocumentDirectory())

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] create tor client: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun removeTorClientProcess(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.removeTorClient()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] remove tor client: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getUnifiedAddressesInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getUnifiedAddresses()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] unified addresses: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getTransparentAddressesInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getTransparentAddresses()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] transparent addresses: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun createNewUnifiedAddressProcess(receivers: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.createNewUnifiedAddress(receivers)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] create new unified address: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun createNewTransparentAddressProcess(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.createNewTransparentAddress()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] create new transparent address: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun checkMyAddressInfo(address: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.checkMyAddress(address)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] create new unified address: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getWalletSaveRequiredInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getWalletSaveRequired()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] get wallet save required: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun setConfigWalletToProdProcess(performancelevel: String, minconfirmations: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.setConfigWalletToProd(performancelevel, minconfirmations.toUInt())

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] set wallet config prod: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }
    
    @ReactMethod
    fun getConfigWalletPerformanceInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getConfigWalletPerformance()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] get wallet config performance level: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getWalletVersionInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getWalletVersion()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] get wallet version: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun sendProcess(send_json: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.send(send_json)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] send: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun confirmProcess(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.confirm()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] confirm: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun stakeProcess(stake_json: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.stake(stake_json)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp.toString())
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] create stake tx: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    private fun makeJsonString(obj: Map<String, Any?>): String? {
        return try {
            JSONObject(obj).toString()
        } catch (e: Exception) {
            null
        }
    }

    @ReactMethod
    fun withdrawStakeProcess(txid: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val payload = makeJsonString(mapOf("txid" to txid))
                if (payload == null) {
                    val err = "Error: [Native] withdraw stake. Could not build JSON."
                    Log.i("MAIN", err)
                    withContext(Dispatchers.Main) {
                        promise.resolve(err)
                    }
                } else {
                    val resp = uniffi.zingo.withdrawStake(payload)

                    withContext(Dispatchers.Main) {
                        promise.resolve(resp.toString())
                    }
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] withdraw stake tx: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun beginUnstakeProcess(txid: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val payload = makeJsonString(mapOf("txid" to txid))
                if (payload == null) {
                    val err = "Error: [Native] begin unstake. Could not build JSON."
                    Log.i("MAIN", err)
                    withContext(Dispatchers.Main) {
                        promise.resolve(err)
                    }
                } else {
                    val resp = uniffi.zingo.beginUnstake(payload)

                    withContext(Dispatchers.Main) {
                        promise.resolve(resp.toString())
                    }
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] begin unstake tx: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getRosterInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getRoster()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] get roster info: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun getWalletBondsInfo(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.getWalletBonds()

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] get wallet bonds info: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun requestFaucetFundsProcess(address: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val resp = uniffi.zingo.requestFaucetFunds(address)

                withContext(Dispatchers.Main) {
                    promise.resolve(resp)
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] request faucet funds: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

    @ReactMethod
    fun retargetBondProcess(txid: String, finalizer: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                uniffi.zingo.initLogging()
                val payload = makeJsonString(mapOf("bond_key" to txid, "new_finalizer" to finalizer))
                if (payload == null) {
                    val err = "Error: [Native] Retarget bond. Could not build JSON."
                    Log.i("MAIN", err)
                    withContext(Dispatchers.Main) {
                        promise.resolve(err)
                    }
                } else {
                    val resp = uniffi.zingo.retargetBond(payload)

                    withContext(Dispatchers.Main) {
                        promise.resolve(resp.toString())
                    }
                }
            } catch (e: Exception) {
                val errorMessage = "Error: [Native] Retarget bond: ${e.localizedMessage}"
                Log.e("MAIN", errorMessage, e)

                withContext(Dispatchers.Main) {
                    promise.resolve(errorMessage)
                }
            }
        }
    }

}
