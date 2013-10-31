angular.module("MineSweeper", [])

.controller("AppCtrl", ["$scope", "$utils", function($scope, $utils) {
  $scope.difficulties = [
    {label: "Easy", mines: 2, size: 4},
    {label: "Normal", mines: 10, size: 8},
    {label: "Hard", mines: 80, size: 12},
    {label: "Chuck Norris", mines: 380, size: 20}
  ];
  
  $scope.newGame = function() {
    $scope.settings = false;
    $scope.state = undefined;
    
    $scope.model = $utils.generateTiles($scope.difficulty.size, $scope.difficulty.size);
    $utils.addMines($scope.model, $scope.difficulty.mines);
  };
  
  $scope.croakAndDie = function() {
    $scope.state = {error: true};
    $scope.model.forEach(function(row) {
      row.forEach(function(t) {
        $utils.showTileContent($scope.model, t);
      });
    });
  };
  
  $scope.onTileClick = function(tile) {
    delete tile.value;
    delete tile.flagged;
    
    if (tile.isMined) {
      tile.exploded = true;
      $scope.croakAndDie();
    } else {
      $utils.updateAdjacent($scope.model, tile);
      $utils.showTileContent($scope.model, tile)
    }
  };
  
  $scope.onTileAltClick = $utils.flag;
  
  $scope.validate = function(event) {
    if (event.altKey) {
      $utils.allYourBase($scope.model);
      return;
    }
    
    if ($utils.check($scope.model) === true) {
      $scope.state = {success: true};
    } else {
      $scope.croakAndDie();
    }
  };
  
  $scope.difficulty = $scope.difficulties[1];
  
  $scope.newGame();
}])

.factory("$utils", [function() {
  return {
    flag: function(tile) {
      tile.flagged = true;
    },
    
    allYourBase: function(tiles) {
      tiles.forEach(function(row) {
        row.forEach(function(tile) {
          if (tile.isMined) {
            this.flag(tile);
          }
        }, this);
      }, this);
    },
    
    check: function(tiles) {
      var count = 0;
      
      tiles.forEach(function(row) {
        row.forEach(function(tile) {
          count += (!tile.isMined && !tile.discovered ? 1 : 0);
        });
      });
      
      return count === 0;
    },
    
    showTileContent: function(tiles, tile) {
      if (tile.isMined && !tile.exploded) {
        this.flag(tile);
        return true;
      } else {
        tile.discovered = true;
        tile.value = this.countAdjacentMines(tiles, tile);
        delete tile.flagged;
        return false;
      }
    },
    
    updateAdjacent: function(tiles, tile) {
      if (tile.value !== undefined) {
        return;
      }
      
      tile.value = this.countAdjacentMines(tiles, tile);
      tile.discovered = true;
      
      if (tile.value === 0) {
        this.getAdjacentTiles(tiles, tile).forEach(function(t) {
          this.updateAdjacent(tiles, t);
        }, this);
      }
    },
    
    countAdjacentMines: function(tiles, tile) {
      var neighbours = this.getAdjacentTiles(tiles, tile);
      return neighbours.filter(function(tile) {return tile.isMined;}).length;
    },
    
    getAdjacentTiles: function(tiles, tile) {
      var coord = this.getTileCoordinates(tiles, tile);
      
      var offsets = [
        {x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1},
        {x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 1},
        {x: -1, y: 1}, {x: -1, y: 0}
      ];
      
      offsets.forEach(function(c) {c.x += coord.columnIndex; c.y += coord.rowIndex;})
      
      return offsets
        .filter(function(c) {return c.x >= 0 && c.y >= 0})
        .filter(function(c) {return c.x < tiles[0].length && c.y < tiles.length})
        .map(function(c) {return tiles[c.y][c.x]})
      ;
    },
    
    getTileCoordinates: function(tiles, tile) {
      var rowIndex;
      var columnIndex;
      
      tiles.forEach(function(row, i) {
        row.forEach(function(t, j) {
          if (t === tile) {
            rowIndex = i;
            columnIndex = j;
          }
        });
      });
      
      return {rowIndex: rowIndex, columnIndex: columnIndex};
    },
    
    generateTiles: function(width, height) {
      var tiles = [];
      
      for (var i = 0; i < height; i++) {
        var row = [];
        
        for (var j = 0; j < width; j++) {
          row.push(this.getDefaultSlot(i, j));
        }
        
        tiles.push(row);
      }
      
      return tiles;
    },
    
    getDefaultSlot: function(row, column) {
      return {flagged: false, discovered: false};
    },
    
    addMines: function(tiles, amount) {
      var alreadyMined = [];
      
      while (amount > 0) {
        var rowIndex = parseInt(Math.random()*tiles[0].length);
        var columnIndex = parseInt(Math.random()*tiles.length);
        
        if (alreadyMined.indexOf('' + rowIndex + columnIndex) != -1) {
          continue;
        }
        
        alreadyMined.push('' + rowIndex + columnIndex);
        tiles[rowIndex][columnIndex].isMined = true;
        amount--;
      }
    }
  };
}])

.directive("tile", [function() {
  return {
    replace: true,
    restrict: 'E',
    scope: {data: '=', click: "&onClick", onAltClick: "&"},
    template: '<div class="tile" ng-class="getClass()" ng-click="handleClick($event)"">'
    + '<i ng-show="data.flagged" class="fa fa-flag-o"></i>'
    + '<i ng-show="data.exploded" class="fa fa-crosshairs"></i>'
    + '<span ng-hide="data.flagged || data.exploded">{{data.value}}</span></div>',
    link: function($scope, elm, attrs) {
      $scope.handleClick = function(event) {
        if (event.altKey) {
          $scope.onAltClick();
        } else {
          $scope.click();
        }
      };
      
      $scope.getClass = function(){
        if (!$scope.data) {
          return "";
        }
        
        if ($scope.data.exploded) {
          return "boom";
        }
        
        if ($scope.data.flagged) {
          return "flagged";
        }
        
        if ($scope.data.discovered) {
          return "discovered";
        }
        
        return "unknown";
      };
    }
  };
}])

;