// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "B1CodesLoaders",
    platforms: [
        .iOS(.v15),
        .macOS(.v12)
    ],
    products: [
        .library(
            name: "B1CodesLoaders",
            targets: ["B1CodesLoaders"]
        )
    ],
    targets: [
        .target(
            name: "B1CodesLoaders",
            path: "Sources/B1CodesLoaders"
        ),
        .testTarget(
            name: "B1CodesLoadersTests",
            dependencies: ["B1CodesLoaders"],
            path: "Tests/B1CodesLoadersTests"
        )
    ]
)
