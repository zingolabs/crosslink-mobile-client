//
//  RPCModule.swift
//  ZingoDelegator
//
//  Created by Juan Carlos Carmona Calvo on 4/2/24.
//

import Foundation
import React

private func walletFileExistsAt(_ walletDir: String) throws -> Bool {
  return try walletExists(walletDir: walletDir)
}

@objc(RPCModule)
class RPCModule: NSObject {
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
      return true
  }
  
  enum FileError: Error {
    case documentsDirectoryNotFoundError(String)
    case saveFileError(String)
    case writeFileError(String)
    case walletFileError(String)
  }
  
  func getDocumentsDirectory() throws -> String {
    let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
    guard let pathsFirst = paths.first else {
      throw FileError.documentsDirectoryNotFoundError("Error: [Native] Documents directory could not be located.")
    }
    return pathsFirst
  }
  
  func getFileName(_ file: String) throws -> String {
    let documentsDirectory = try getDocumentsDirectory()
    let fileName = "\(documentsDirectory)/\(file)"
    return fileName
  }
  
  func fileExists(_ fileName: String) throws -> String {
    let fileExists = try FileManager.default.fileExists(atPath: getFileName(fileName))
    if fileExists {
      NSLog("[Native] File exists \(fileName)")
      return "true"
    } else {
      NSLog("[Native] File DOES not exists \(fileName)")
      return "false"
    }
  }

  func walletFileExists() throws -> String {
    return try walletFileExistsAt(getDocumentsDirectory()) ? "true" : "false"
  }

  func checkWalletFileResult(_ result: String, _ what: String) throws {
    if result.lowercased().hasPrefix(Constants.ErrorPrefix.rawValue) {
      let err = "Error: [Native] \(what). \(result)"
      NSLog(err)
      throw FileError.walletFileError(err)
    }
  }
  
  @objc(walletExists:reject:)
  func walletExists(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let result = try walletFileExists()
      DispatchQueue.main.async {
        resolve(result)
      }
    } catch {
      NSLog("Error: [Native] wallet exists error: \(error.localizedDescription)")
      DispatchQueue.main.async {
        resolve("false")
      }
    }
  }

  func saveBackgroundFile(_ jsonString: String) throws {
    do {
      // the content of this JSON can be represented safely in utf8.
      try jsonString.write(toFile: getFileName(Constants.BackgroundFileName.rawValue), atomically: true, encoding: .utf8)
    } catch {
      throw FileError.writeFileError("Error: [Native] writting background file error: \(error.localizedDescription)")
    }
  }

  @objc(deleteExistingWallet:reject:)
  func deleteExistingWallet(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      try checkWalletFileResult(try deleteWallet(walletDir: getDocumentsDirectory()), "deleting wallet")
      DispatchQueue.main.async {
        resolve("true")
      }
    } catch {
      NSLog("Error: [Native] deleting wallet \(error.localizedDescription)")
      DispatchQueue.main.async {
        resolve("false")
      }
    }
  }

  
  func saveWalletInternal() throws {
    do {
      let written = try saveWallet()
      try checkWalletFileResult(written, "Couldn't save the wallet")
      NSLog("[Native] wallet file written: \(written)")
    } catch {
      let err = "Error: [Native] Couldn't save the wallet. \(error.localizedDescription)"
      NSLog(err)
      throw FileError.saveFileError(err)
    }
  }

  func fnCreateNewWallet(
    serveruri: String, 
    chainhint: String, 
    performancelevel: String, 
    minconfirmations: String
  ) throws -> String {
    let seed = try initNew(walletDir: getDocumentsDirectory(), serverUri: serveruri, chainHint: chainhint, performanceLevel: performancelevel, minConfirmations: UInt32(minconfirmations) ?? 0)
    return String(seed)
  }

  @objc(createNewWallet:chainhint:performancelevel:minconfirmations:resolve:reject:)
  func createNewWallet(
    _ serveruri: String, 
    chainhint: String, 
    performancelevel: String, 
    minconfirmations: String, 
    resolve: @escaping RCTPromiseResolveBlock, 
    reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      let seedStr = try self.fnCreateNewWallet(serveruri: serveruri, chainhint: chainhint, performancelevel: performancelevel, minconfirmations: minconfirmations)
      DispatchQueue.main.async {
        resolve(seedStr)
      }
    } catch {
      let err = "Error: [Native] Creating a new wallet. \(error.localizedDescription)"
      NSLog(err)
      DispatchQueue.main.async {
        resolve(err)
      }
    }
  }
  
  func fnRestoreWalletFromSeed(
    restoreSeed: String, 
    birthday: String, 
    serveruri: String, 
    chainhint: String, 
    performancelevel: String, 
    minconfirmations: String
  ) throws -> String {
    let seed = try initFromSeed(walletDir: getDocumentsDirectory(), seed: restoreSeed, birthday: UInt32(birthday) ?? 0, serverUri: serveruri, chainHint: chainhint, performanceLevel: performancelevel, minConfirmations: UInt32(minconfirmations) ?? 0)
    return String(seed)
  }

  @objc(restoreWalletFromSeed:birthday:serveruri:chainhint:performancelevel:minconfirmations:resolve:reject:)
  func restoreWalletFromSeed(
    _ restoreSeed: String, 
    birthday: String, 
    serveruri: String, 
    chainhint: String, 
    performancelevel: String,
    minconfirmations: String,
    resolve: @escaping RCTPromiseResolveBlock, 
    reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      let seedStr = try self.fnRestoreWalletFromSeed(restoreSeed: restoreSeed, birthday: birthday, serveruri: serveruri, chainhint: chainhint, performancelevel: performancelevel, minconfirmations: minconfirmations)
      DispatchQueue.main.async {
        resolve(seedStr)
      }
    } catch {
      let err = "Error: [Native] Restoring a wallet with seed. \(error.localizedDescription)"
      NSLog(err)
      DispatchQueue.main.async {
        resolve(err)
      }
    }
  }
  
  func fnLoadExistingWallet(
    serveruri: String, 
    chainhint: String,
    performancelevel: String, 
    minconfirmations: String
  ) throws -> String {
    NSLog("[Native] loadExistingWallet: opening wallet against \(serveruri) (\(chainhint))")
    let seed = try initFromFile(walletDir: getDocumentsDirectory(), serverUri: serveruri, chainHint: chainhint, performanceLevel: performancelevel, minConfirmations: UInt32(minconfirmations) ?? 0)
    let seedStr = String(seed)
    NSLog("[Native] loadExistingWallet: opened OK")
    return seedStr
  }

  @objc(loadExistingWallet:chainhint:performancelevel:minconfirmations:resolve:reject:)
  func loadExistingWallet(
    _ serveruri: String, 
    chainhint: String, 
    performancelevel: String, 
    minconfirmations: String,
    resolve: @escaping RCTPromiseResolveBlock, 
    reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      let seedStr = try self.fnLoadExistingWallet(serveruri: serveruri, chainhint: chainhint, performancelevel: performancelevel, minconfirmations: minconfirmations)
      DispatchQueue.main.async {
        resolve(seedStr)
      }
    } catch {
      let err = "Error: [Native] Loading existing wallet. \(error.localizedDescription)"
      NSLog(err)
      DispatchQueue.main.async {
        resolve(err)
      }
    }
  }

  func fnDoSave(_ dict: [AnyHashable: Any]) {
    if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
      do {
        try self.saveWalletInternal()
        DispatchQueue.main.async {
          resolve("true")
        }
      } catch {
        NSLog("Error: [Native] Saving wallet error: \(error.localizedDescription)")
        DispatchQueue.main.async {
          resolve("false")
        }
      }
    } else {
      let err = "Error: [Native] Save wallet. Argument problem."
      NSLog(err)
    }
  }

  @objc(doSave:reject:)
  func doSave(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let dict: [String: Any] = ["resolve": resolve]
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
            self.fnDoSave(dict)
        }
    }
  }

  func fnGetLatestBlockServerInfo(_ dict: [AnyHashable: Any]) {
    if let serveruri = dict["serveruri"] as? String,
       let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
      do {
        let resp = try getLatestBlockServer(serverUri: serveruri)
        let respStr = String(resp)
        DispatchQueue.main.async {
          resolve(respStr)
        }
      } catch {
        let err = "Error: [Native] Get server latest block. \(error.localizedDescription)"
        NSLog(err)
        DispatchQueue.main.async {
          resolve(err)
        }
      }
    } else {
      let err = "Error: [Native] Get server latest block. Argument problem."
      NSLog(err)
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          DispatchQueue.main.async {
            resolve(err)
          }
      }
    }
  }
  
  @objc(getLatestBlockServerInfo:resolve:reject:)
  func getLatestBlockServerInfo(_ serveruri: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["serveruri": serveruri, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
          if let self = self {
              self.fnGetLatestBlockServerInfo(dict)
          }
      }
  }

  func fnDiscoverIndexers(_ dict: [AnyHashable: Any]) {
    if let network = dict["network"] as? String,
       let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
      do {
        let resp = try discoverIndexers(network: network)
        let respStr = String(resp)
        DispatchQueue.main.async {
          resolve(respStr)
        }
      } catch {
        let err = "Error: [Native] Discover indexers. \(error.localizedDescription)"
        NSLog(err)
        DispatchQueue.main.async {
          resolve(err)
        }
      }
    } else {
      let err = "Error: [Native] Discover indexers. Argument problem."
      NSLog(err)
    }
  }

  @objc(discoverIndexers:network:reject:)
  func discoverIndexersInfo(_ network: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["network": network, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
          if let self = self {
              self.fnDiscoverIndexers(dict)
          }
      }
  }

  func fnProbeIndexer(_ dict: [AnyHashable: Any]) {
    if let serveruri = dict["serveruri"] as? String,
       let network = dict["network"] as? String,
       let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
      do {
        let resp = try probeIndexer(serverUri: serveruri, network: network)
        let respStr = String(resp)
        DispatchQueue.main.async {
          resolve(respStr)
        }
      } catch {
        let err = "Error: [Native] Probe indexer. \(error.localizedDescription)"
        NSLog(err)
        DispatchQueue.main.async {
          resolve(err)
        }
      }
    } else {
      let err = "Error: [Native] Probe indexer. Argument problem."
      NSLog(err)
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          DispatchQueue.main.async {
            resolve(err)
          }
      }
    }
  }

  @objc(probeIndexer:network:resolve:reject:)
  func probeIndexerInfo(_ serveruri: String, network: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["serveruri": serveruri, "network": network, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
          if let self = self {
              self.fnProbeIndexer(dict)
          }
      }
  }

  func fnSelectBestIndexer(_ dict: [AnyHashable: Any]) {
    if let network = dict["network"] as? String,
       let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
      do {
        let resp = try selectBestIndexer(network: network)
        let respStr = String(resp)
        DispatchQueue.main.async {
          resolve(respStr)
        }
      } catch {
        let err = "Error: [Native] Select best indexer. \(error.localizedDescription)"
        NSLog(err)
        DispatchQueue.main.async {
          resolve(err)
        }
      }
    } else {
      let err = "Error: [Native] Select best indexer. Argument problem."
      NSLog(err)
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          DispatchQueue.main.async {
            resolve(err)
          }
      }
    }
  }

  @objc(selectBestIndexer:network:reject:)
  func selectBestIndexerInfo(_ network: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["network": network, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
          if let self = self {
              self.fnSelectBestIndexer(dict)
          }
      }
  }

  func fnGetLatestBlockWalletInfo(_ dict: [AnyHashable: Any]) {
    if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try getLatestBlockWallet()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] Get wallet latest block. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
    } else {
      let err = "Error: [Native] Get wallet latest block. Argument problem."
      NSLog(err)
    }
  }
  
  @objc(getLatestBlockWalletInfo:reject:)
  func getLatestBlockWalletInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
          if let self = self {
              self.fnGetLatestBlockWalletInfo(dict)
          }
      }
  }

  func fnGetDonationAddress(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try getDeveloperDonationAddress()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] Get developer donation address. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
        let err = "Error: [Native] Get developer donation address. Command arguments problem."
        NSLog(err)
      }
  }
  
  @objc(getDonationAddress:reject:)
  func getDonationAddress(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
          if let self = self {
              self.fnGetDonationAddress(dict)
          }
      }
  }

  func fnGetZenniesDonationAddress(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try getZenniesForZingoDonationAddress()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] Get zennies donation address. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
        let err = "Error: [Native] Get zennies donation address. Command arguments problem."
        NSLog(err)
      }
  }
  
  @objc(getZenniesDonationAddress:reject:)
  func getZenniesDonationAddress(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
          if let self = self {
              self.fnGetZenniesDonationAddress(dict)
          }
      }
  }

  func fnGetValueTransfersList(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          do {
            let resp = try getValueTransfers()
            let respStr = String(resp)
            DispatchQueue.main.async {
              resolve(respStr)
            }
          } catch {
            let err = "Error: [Native] Get value transfers. \(error.localizedDescription)"
            NSLog(err)
            DispatchQueue.main.async {
              resolve(err)
            }          
          }
      } else {
          let err = "Error: [Native] Get value transfers. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getValueTransfersList:reject:)
  func getValueTransfersList(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
          if let self = self {
              self.fnGetValueTransfersList(dict)
          }
      }
  }

  func fnSetCryptoDefaultProvider(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try setCryptoDefaultProviderToRing()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] Setting the crypto provider to ring by default. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] Setting the crypto provider to ring by default. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(setCryptoDefaultProvider:reject:)
  func setCryptoDefaultProvider(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnSetCryptoDefaultProvider(dict)
        }
      }
  }

  func fnPollSyncInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try pollSync()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let detail = error.localizedDescription.isEmpty
                          ? String(describing: error)
                          : error.localizedDescription
          let err = "Error: [Native] Sync poll info. \(detail)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] Sync poll info. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(pollSyncInfo:reject:)
  func pollSyncInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnPollSyncInfo(dict)
        }
      }
  }

  func fnRunSyncProcess(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        var respStr: String = ""
        do {
          let resp = try runSync()
          respStr = String(resp)
          if !respStr.lowercased().hasPrefix(Constants.ErrorPrefix.rawValue) {
            // Also save the wallet after sync
            try self.saveWalletInternal()
          }
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] Sync run process. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] Sync run process. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(runSyncProcess:reject:)
  func runSyncProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnRunSyncProcess(dict)
        }
      }
  }

  func fnPauseSyncProcess(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          do {
            let resp = try pauseSync()
            let respStr = String(resp)
            DispatchQueue.main.async {
              resolve(respStr)
            }
          } catch {
            let err = "Error: [Native] Sync pause process. \(error.localizedDescription)"
            NSLog(err)
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      } else {
          let err = "Error: [Native] Sync pause process. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(pauseSyncProcess:reject:)
  func pauseSyncProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnPauseSyncProcess(dict)
        }
      }
  }

  func fnStatusSyncInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        var respStr: String = ""
        do {
          let resp = try statusSync()
          respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] Sync Status info. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] Sync status info. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(statusSyncInfo:reject:)
  func statusSyncInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnStatusSyncInfo(dict)
        }
      }
  }

  func fnRunRescanProcess(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          do {
            let resp = try runRescan()
            let respStr = String(resp)
            DispatchQueue.main.async {
              resolve(respStr)
            }
          } catch {
            let err = "Error: [Native] Rescan run process. \(error.localizedDescription)"
            NSLog(err)
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      } else {
          let err = "Error: [Native] Rescan run process. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(runRescanProcess:reject:)
  func runRescanProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnRunRescanProcess(dict)
        }
      }
  }

  func fnInfoServerInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          do {
            let resp = try infoServer()
            let respStr = String(resp)
            DispatchQueue.main.async {
              resolve(respStr)
            }
          } catch {
            let err = "Error: [Native] info server. \(error.localizedDescription)"
            NSLog(err)
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      } else {
          let err = "Error: [Native] info server. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(infoServerInfo:reject:)
  func infoServerInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnInfoServerInfo(dict)
        }
      }
  }

  func fnGetSeedInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try getSeed()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] seed. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] seed. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getSeedInfo:reject:)
  func getSeedInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetSeedInfo(dict)
        }
      }
  }

  func fnGetUfvkInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try getUfvk()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] ufvk. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] ufvk. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getUfvkInfo:reject:)
  func getUfvkInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetUfvkInfo(dict)
        }
      }
  }

  func fnChangeServerProcess(_ dict: [AnyHashable: Any]) {
      if let serveruri = dict["serveruri"] as? String,
          let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try changeServer(serverUri: serveruri)
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] change server. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] change server. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(changeServerProcess:resolve:reject:)
  func changeServerProcess(_ serveruri: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["serveruri": serveruri, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnChangeServerProcess(dict)
        }
      }
  }

  func fnWalletKindInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try walletKind()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] wallet kind. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] wallet kind. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(walletKindInfo:reject:)
  func walletKindInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnWalletKindInfo(dict)
        }
      }
  }

  func fnParseAddressInfo(_ dict: [AnyHashable: Any]) {
      if let address = dict["address"] as? String,
          let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try parseAddress(address: address)
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] parse address. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] parse address. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(parseAddressInfo:resolve:reject:)
  func parseAddressInfo(_ address: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["address": address, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnParseAddressInfo(dict)
        }
      }
  }

  func fnGetVersionInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          do {
            let resp = try getVersion()
            let respStr = String(resp)
            DispatchQueue.main.async {
              resolve(respStr)
            }
          } catch {
            let err = "Error: [Native] version. \(error.localizedDescription)"
            NSLog(err)
            DispatchQueue.main.async {
              resolve(err)
            }          
          }
      } else {
          let err = "Error: [Native] version. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getVersionInfo:reject:)
  func getVersionInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetVersionInfo(dict)
        }
      }
  }

func fnGetBalanceInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          do {
            let resp = try getBalance()
            let respStr = String(resp)
            DispatchQueue.main.async {
              resolve(respStr)
            }
          } catch {
            let err = "Error: [Native] balance. \(error.localizedDescription)"
            NSLog(err)
            DispatchQueue.main.async {
              resolve(err)
            }          
          }
      } else {
          let err = "Error: [Native] balance. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getBalanceInfo:reject:)
  func getBalanceInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetBalanceInfo(dict)
        }
      }
  }

  func fnGetTotalMemobytesToAddressInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try getTotalMemobytesToAddress()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] memobytes to address. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] memobytes to address. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getTotalMemobytesToAddressInfo:reject:)
  func getTotalMemobytesToAddressInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetTotalMemobytesToAddressInfo(dict)
        }
      }
  }

  func fnGetTotalValueToAddressInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try getTotalValueToAddress()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] value to address. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] value to address. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getTotalValueToAddressInfo:reject:)
  func getTotalValueToAddressInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetTotalValueToAddressInfo(dict)
        }
      }
  }

  func fnGetTotalSpendsToAddressInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try getTotalSpendsToAddress()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] spends to address. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] spends to address. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getTotalSpendsToAddressInfo:reject:)
  func getTotalSpendsToAddressInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetTotalSpendsToAddressInfo(dict)
        }
      }
  }

  func fnZecPriceInfo(_ dict: [AnyHashable: Any]) {
      if let tor = dict["tor"] as? String,
          let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try zecPrice(tor: tor)
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] zec price. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] zec price. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(zecPriceInfo:resolve:reject:)
  func zecPriceInfo(_ tor: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["tor": tor, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnZecPriceInfo(dict)
        }
      }
  }

  func fnGetSpendableBalanceWithAddressInfo(_ dict: [AnyHashable: Any]) {
      if let address = dict["address"] as? String,
          let zennies = dict["zennies"] as? String,
          let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try getSpendableBalanceWithAddress(address: address, zennies: zennies)
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] spendable balance address. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] spendable balance address. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(getSpendableBalanceWithAddressInfo:zennies:resolve:reject:)
  func getSpendableBalanceWithAddressInfo(_ address: String, zennies: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["address": address, "zennies": zennies, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetSpendableBalanceWithAddressInfo(dict)
        }
      }
  }

  func fnGetSpendableBalanceTotalInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          do {
            let resp = try getSpendableBalanceTotal()
            let respStr = String(resp)
            DispatchQueue.main.async {
              resolve(respStr)
            }
          } catch {
            let err = "Error: [Native] spendable balance total. \(error.localizedDescription)"
            NSLog(err)
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      } else {
          let err = "Error: [Native] spendable balance total. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getSpendableBalanceTotalInfo:reject:)
  func getSpendableBalanceTotalInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetSpendableBalanceTotalInfo(dict)
        }
      }
  }

  func fnCreateTorClientProcess(_ dict: [AnyHashable: Any]) throws {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try createTorClient(dataDir: try getDocumentsDirectory())
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] create tor client. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] create tor client. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(createTorClientProcess:reject:)
  func createTorClientProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          do {
            try self.fnCreateTorClientProcess(dict)
          } catch {
            let err = "Error: [Native] create tor client. Document dir."
            NSLog(err)
            resolve(err)
          }
        }
      }
  }

  func fnRemoveTorClientProcess(_ dict: [AnyHashable: Any]) throws {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try removeTorClient()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] remove tor client. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] remove tor client. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(removeTorClientProcess:reject:)
  func removeTorClientProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          do {
            try self.fnRemoveTorClientProcess(dict)
          } catch {
            let err = "Error: [Native] remove tor client. Document dir."
            NSLog(err)
            resolve(err)
          }
        }
      }
  }

  func fnGetUnifiedAddressesInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          do {
            let resp = try getUnifiedAddresses()
            let respStr = String(resp)
            DispatchQueue.main.async {
              resolve(respStr)
            }
          } catch {
            let err = "Error: [Native] unified addresses. \(error.localizedDescription)"
            NSLog(err)
            DispatchQueue.main.async {
              resolve(err)
            }          
          }
      } else {
          let err = "Error: [Native] unified addresses. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getUnifiedAddressesInfo:reject:)
  func getUnifiedAddressesInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetUnifiedAddressesInfo(dict)
        }
      }
  }

  func fnGetTransparentAddressesInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          do {
            let resp = try getTransparentAddresses()
            let respStr = String(resp)
            DispatchQueue.main.async {
              resolve(respStr)
            }
          } catch {
            let err = "Error: [Native] transparent addresses. \(error.localizedDescription)"
            NSLog(err)
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      } else {
          let err = "Error: [Native] transparent addresses. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getTransparentAddressesInfo:reject:)
  func getTransparentAddressesInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetTransparentAddressesInfo(dict)
        }
      }
  }

  func fnCreateNewUnifiedAddressProcess(_ dict: [AnyHashable: Any]) {
      if let receivers = dict["receivers"] as? String,
          let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try createNewUnifiedAddress(receivers: receivers)
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] create new unified address. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] create new unified address. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(createNewUnifiedAddressProcess:resolve:reject:)
  func createNewUnifiedAddressProcess(_ receivers: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["receivers": receivers, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnCreateNewUnifiedAddressProcess(dict)
        }
      }
  }

  func fnCreateNewTransparentAddressProcess(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try createNewTransparentAddress()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] create new transparent address. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] create new transparent address. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(createNewTransparentAddressProcess:reject:)
  func createNewTransparentAddressProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnCreateNewTransparentAddressProcess(dict)
        }
      }
  }

  func fnCheckMyAddressInfo(_ dict: [AnyHashable: Any]) {
      if let address = dict["address"] as? String,
          let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try checkMyAddress(address: address)
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] check address. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] check address. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(checkMyAddressInfo:resolve:reject:)
  func checkMyAddressInfo(_ address: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["address": address, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnCheckMyAddressInfo(dict)
        }
      }
  }

  func fnGetWalletSaveRequiredInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try getWalletSaveRequired()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] get wallet save required. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }          
        }
      } else {
          let err = "Error: [Native] get wallet save required. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getWalletSaveRequiredInfo:reject:)
  func getWalletSaveRequiredInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetWalletSaveRequiredInfo(dict)
        }
      }
  }

  func fnSetConfigWalletToProdProcess(_ dict: [AnyHashable: Any]) {
      if let performancelevel = dict["performancelevel"] as? String,
          let minconfirmations = dict["minconfirmations"] as? String,
          let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try setConfigWalletToProd(performanceLevel: performancelevel, minConfirmations: UInt32(minconfirmations) ?? 0)
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] set wallet config prod. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] set wallet config prod. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(setConfigWalletToProdProcess:minconfirmations:resolve:reject:)
  func setConfigWalletToProdProcess(_ performancelevel: String, minconfirmations: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["performancelevel": performancelevel, "minconfirmations": minconfirmations, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnSetConfigWalletToProdProcess(dict)
        }
      }
  }

  func fnGetConfigWalletPerformanceInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          do {
            let resp = try getConfigWalletPerformance()
            let respStr = String(resp)
            DispatchQueue.main.async {
              resolve(respStr)
            }
          } catch {
            let err = "Error: [Native] get wallet config performance level. \(error.localizedDescription)"
            NSLog(err)
            DispatchQueue.main.async {
              resolve(err)
            }          
          }
      } else {
          let err = "Error: [Native] get wallet config performance level. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getConfigWalletPerformanceInfo:reject:)
  func getConfigWalletPerformanceInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetConfigWalletPerformanceInfo(dict)
        }
      }
  }

  func fnGetWalletVersionInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          do {
            let resp = try getWalletVersion()
            let respStr = String(resp)
            DispatchQueue.main.async {
              resolve(respStr)
            }
          } catch {
            let err = "Error: [Native] get wallet version. \(error.localizedDescription)"
            NSLog(err)
            DispatchQueue.main.async {
              resolve(err)
            }          
          }
      } else {
          let err = "Error: [Native] get wallet version. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getWalletVersionInfo:reject:)
  func getWalletVersionInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetWalletVersionInfo(dict)
        }
      }
  }

  func fnSendProcess(_ dict: [AnyHashable: Any]) {
    if let send_json = dict["send_json"] as? String,
        let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
      do {
        let resp = try send(sendJson: send_json)
        let respStr = String(resp)
        DispatchQueue.main.async {
          resolve(respStr)
        }
      } catch {
        let err = "Error: [Native] send. \(error.localizedDescription)"
        NSLog(err)
        DispatchQueue.main.async {
          resolve(err)
        }
      }
    } else {
        let err = "Error: [Native] send. Command arguments problem."
        NSLog(err)
        if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          DispatchQueue.main.async {
            resolve(err)
          }
        }
    }
  }

  @objc(sendProcess:resolve:reject:)
  func sendProcess(_ send_json: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let dict: [String: Any] = ["send_json": send_json, "resolve": resolve]
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      if let self = self {
        self.fnSendProcess(dict)
      }
    }
  }
  
  func fnConfirmProcess(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try confirm()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] confirm. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] confirm. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(confirmProcess:reject:)
  func confirmProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnConfirmProcess(dict)
        }
      }
  }
  
  func fnStakeProcess(_ dict: [AnyHashable: Any]) {
    if let stake_json = dict["stake_json"] as? String,
       let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
      do {
        // Call into the Rust/uniffi function
        let resp = try stake(stakeJson: stake_json)
        let respStr = String(resp)
        DispatchQueue.main.async {
          resolve(respStr)
        }
      } catch {
        let err = "Error: [Native] stake. \(error.localizedDescription)"
        NSLog(err)
        DispatchQueue.main.async {
          resolve(err)
        }
      }
    } else {
      let err = "Error: [Native] stake. Command arguments problem."
      NSLog(err)
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        DispatchQueue.main.async {
          resolve(err)
        }
      }
    }
  }
  
  @objc(stakeProcess:resolve:reject:)
  func stakeProcess(_ stake_json: String,
                    resolve: @escaping RCTPromiseResolveBlock,
                    reject: @escaping RCTPromiseRejectBlock) {
    let dict: [String: Any] = ["stake_json": stake_json, "resolve": resolve]
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      if let self = self {
        self.fnStakeProcess(dict)
      }
    }
  }
  
  private func makeJsonString(_ obj: [String: Any]) -> String? {
    guard JSONSerialization.isValidJSONObject(obj),
          let data = try? JSONSerialization.data(withJSONObject: obj, options: []),
          let s = String(data: data, encoding: .utf8)
    else { return nil }
    return s
  }
  
  func fnWithdrawStakeProcess(_ dict: [AnyHashable: Any]) {
    if let txid = dict["txid"] as? String,
       let resolve = dict["resolve"] as? RCTPromiseResolveBlock {

      guard let payload = makeJsonString(["txid": txid]) else {
        let err = "Error: [Native] withdraw_stake. Could not build JSON."
        NSLog(err)
        DispatchQueue.main.async { resolve(err) }
        return
      }

      do {
        // UniFFI typically camelCases: withdraw_stake -> withdrawStake(withdrawStakeJson:)
        let resp = try withdrawStake(withdrawStakeJson: payload)
        let respStr = String(resp)
        DispatchQueue.main.async { resolve(respStr) }
      } catch {
        let err = "Error: [Native] withdraw_stake. \(error.localizedDescription)"
        NSLog(err)
        DispatchQueue.main.async { resolve(err) }
      }

    } else {
      let err = "Error: [Native] withdraw_stake. Command arguments problem."
      NSLog(err)
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        DispatchQueue.main.async { resolve(err) }
      }
    }
  }

  @objc(withdrawStakeProcess:resolve:reject:)
  func withdrawStakeProcess(
    _ txid: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let dict: [String: Any] = ["txid": txid, "resolve": resolve]
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      guard let self = self else { return }
      self.fnWithdrawStakeProcess(dict)
    }
  }
  
  func fnBeginUnstakeProcess(_ dict: [AnyHashable: Any]) {
    if let txid = dict["txid"] as? String,
       let resolve = dict["resolve"] as? RCTPromiseResolveBlock {

      guard let payload = makeJsonString(["txid": txid]) else {
        let err = "Error: [Native] begin_unstake. Could not build JSON."
        NSLog(err)
        DispatchQueue.main.async { resolve(err) }
        return
      }

      do {
        // UniFFI typically camelCases: begin_unstake -> beginUnstake(beginUnstakeJson:)
        let resp = try beginUnstake(beginUnstakeJson: payload)
        let respStr = String(resp)
        DispatchQueue.main.async { resolve(respStr) }
      } catch {
        let err = "Error: [Native] begin_unstake. \(error.localizedDescription)"
        NSLog(err)
        DispatchQueue.main.async { resolve(err) }
      }

    } else {
      let err = "Error: [Native] begin_unstake. Command arguments problem."
      NSLog(err)
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        DispatchQueue.main.async { resolve(err) }
      }
    }
  }

  @objc(beginUnstakeProcess:resolve:reject:)
  func beginUnstakeProcess(
    _ txid: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let dict: [String: Any] = ["txid": txid, "resolve": resolve]
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      guard let self = self else { return }
      self.fnBeginUnstakeProcess(dict)
    }
  }
  
  func fnRetargetBondProcess(_ dict: [AnyHashable: Any]) {
    if let txid = dict["txid"] as? String,
       let newFinalizer = dict["newFinalizer"] as? String,
       let resolve = dict["resolve"] as? RCTPromiseResolveBlock {

      guard let payload = makeJsonString([
        "bond_key": txid,
        "new_finalizer": newFinalizer
      ]) else {
        let err = "Error: [Native] retarget_bond. Could not build JSON."
        NSLog(err)
        DispatchQueue.main.async { resolve(err) }
        return
      }

      do {
        let resp = try retargetBond(retargetBondJson: payload)
        DispatchQueue.main.async { resolve(String(resp)) }
      } catch {
        let err = "Error: [Native] retarget_bond. \(error.localizedDescription)"
        NSLog(err)
        DispatchQueue.main.async { resolve(err) }
      }

    } else {
      let err = "Error: [Native] retarget_bond. Command arguments problem."
      NSLog(err)
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        DispatchQueue.main.async { resolve(err) }
      }
    }
  }

  @objc(retargetBondProcess:finalizer:resolve:reject:)
  func retargetBondProcess(
    _ txid: String,
    finalizer: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let dict: [String: Any] = [
      "txid": txid,
      "newFinalizer": finalizer,
      "resolve": resolve
    ]
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      guard let self = self else { return }
      self.fnRetargetBondProcess(dict)
    }
  }
  
  func fnGetRosterInfo(_ dict: [AnyHashable: Any]) {
    if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
      do {
        // UniFFI typically camelCases: get_roster -> getRoster()
        let resp = try getRoster()
        let respStr = String(resp)
        DispatchQueue.main.async {
          resolve(respStr)
        }
      } catch {
        let err = "Error: [Native] get_roster. \(error.localizedDescription)"
        NSLog(err)
        DispatchQueue.main.async {
          resolve(err)
        }
      }
    } else {
      let err = "Error: [Native] get_roster. Command arguments problem."
      NSLog(err)
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        DispatchQueue.main.async {
          resolve(err)
        }
      }
    }
  }

  @objc(getRosterInfo:reject:)
  func getRosterInfo(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let dict: [String: Any] = ["resolve": resolve]
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      guard let self = self else { return }
      self.fnGetRosterInfo(dict)
    }
  }
  
  
  func fnGetWalletBondsInfo(_ dict: [AnyHashable: Any]) {
    if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
      do {
        // UniFFI camelCases: get_wallet_bonds -> getWalletBonds()
        let resp = try getWalletBonds()
        let respStr = String(resp)
        DispatchQueue.main.async {
          resolve(respStr)
        }
      } catch {
        let err = "Error: [Native] get_wallet_bonds. \(error.localizedDescription)"
        NSLog(err)
        DispatchQueue.main.async {
          resolve(err)
        }
      }
    } else {
      let err = "Error: [Native] get_wallet_bonds. Command arguments problem."
      NSLog(err)
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        DispatchQueue.main.async {
          resolve(err)
        }
      }
    }
  }

  @objc(getWalletBondsInfo:reject:)
  func getWalletBondsInfo(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let dict: [String: Any] = ["resolve": resolve]
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      guard let self = self else { return }
      self.fnGetWalletBondsInfo(dict)
    }
  }
  
  func fnRequestFaucetFundsProcess(_ dict: [AnyHashable: Any]) {
    if let resolve = dict["resolve"] as? RCTPromiseResolveBlock,
       let address = dict["address"] as? String {

      do {
        // UniFFI global function
        let resp = try requestFaucetFunds(address: address)
        DispatchQueue.main.async { resolve(String(resp)) }
      } catch {
        let err = "Error: [Native] request_faucet_funds. \(error.localizedDescription)"
        NSLog(err)
        DispatchQueue.main.async { resolve(err) }
      }
    } else {
      let err = "Error: [Native] request_faucet_funds. Command arguments problem."
      NSLog(err)
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        DispatchQueue.main.async { resolve(err) }
      }
    }
  }

  @objc(requestFaucetFundsProcess:resolve:reject:)
  func requestFaucetFundsProcess(
    _ address: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let dict: [String: Any] = ["resolve": resolve, "address": address]
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      guard let self = self else { return }
      self.fnRequestFaucetFundsProcess(dict)
    }
  }

}
