describe("MineSweeper", function() {
  beforeEach(function() {
    this.addMatchers({
      toContain: function(expected) {
        var actual = this.actual;
        var notText = this.isNot ? " not" : "";

        this.message = function () {
          return "Expected " + actual + notText + " to contain " + expected;
        };

        return actual.split(/\s+/g).indexOf(expected) >= 0;
      }
    });
  });
  
  beforeEach(module("MineSweeper"));
  
  describe("AppCtrl", function() {
    var ctrl, $scope;

    beforeEach(inject(function($utils, $controller, $rootScope) {
      $scope = $rootScope.$new();

      spyOn($utils, "addMines");

      ctrl = $controller('AppCtrl', {$scope: $scope});
    }));
    
    describe("bootstrap", function() {
      it("should create an 8x8 model by default", inject(function($utils) {
        expect($scope.model).toEqual($utils.generateTiles(8, 8));
      }));
      
      it("should add mines", inject(function($utils) {
        expect($utils.addMines).toHaveBeenCalledWith($scope.model, 10);
      }));
    });
    
    describe("onTileClick", function() {
      it("should end in error if the tile had a mine", function() {
        var tile = {row: 0, column: 0, isMined: true};
        $scope.onTileClick(tile, {});
        
        expect($scope.state).toEqual({error: true});
      });
      
      it("should set discovered to true and delete flagged if regular click and no mine", function() {
        var tile = {row: 0, column: 0, flagged: true};
        $scope.onTileClick(tile, {});
        
        expect(tile).toEqual({row: 0, column: 0, discovered: true, value: 0});
      });
      
      it("should set flagged to true if alt click", function() {
        var tile = {row: 0, column: 0};
        $scope.onTileAltClick(tile, {altKey: true});
        
        expect(tile.flagged).toBeTruthy();
      });
    });
    
    describe("validate", function() {
      it("should cheat when alt is pressed", function() {
        $scope.model = [[{isMined: true}, {}], [{}, {}]];
        
        $scope.validate({altKey: true});
        
        expect($scope.model).toEqual(
          [[{isMined: true, flagged: true}, {}], [{}, {}]]
        );
      });
      
      it("should fail if one undiscovered, empty tile is left", function() {
        $scope.model = [[{isMined: true}, {}], [{discovered: true}, {discovered: true}]];
        
        $scope.validate({});
        
        expect($scope.model).toEqual([
          [{isMined: true, flagged: true}, {discovered: true, value: 1}],
          [{discovered: true, value: 1}, {discovered: true, value: 1}]
        ]);
        
        expect($scope.state.error).toBeTruthy();
        expect($scope.state.success).toBeFalsy();
      });
      
      it("should success if all non-mined tiles have been discovered", function() {
        $scope.model = [
          [{isMined: true}, {discovered: true}],
          [{discovered: true}, {discovered: true}]
        ];
        
        $scope.validate({});
        
        expect($scope.state.error).toBeFalsy();
        expect($scope.state.success).toBeTruthy();
      });
    });
  });
  
  describe("tile directive", function() {
    var elm, $scope, isolatedScope;
    var clickHandler;

    beforeEach(inject(function($rootScope, $compile) {
      clickHandler = jasmine.createSpy('clickHandler');
      altClickHandler = jasmine.createSpy('altClickHandler');
      
      elm = angular.element('<tile data="data" on-click="clickHandler()" on-alt-click="altClickHandler()"></tile>');

      $scope = $rootScope;
      $compile(elm)($scope);
      $scope.$digest();
    }));
    
    it("should replace the tile node by a div", function() {
      expect(elm[0].nodeName).toBe('DIV');
    });
    
    it('should call the on-click method', inject(function($parse) {
      $scope.$apply(function() {
        $scope.clickHandler = clickHandler;
      });
      
      var e = document.createEvent("MouseEvents");
      e.initMouseEvent("click");
      elm[0].dispatchEvent(e);
      
      expect(clickHandler).toHaveBeenCalled();
    }));
    
    it('should call the on-alt-click method', inject(function($parse) {
      $scope.$apply(function() {
        $scope.altClickHandler = altClickHandler;
      });
      
      var e = document.createEvent("MouseEvents");
      e.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, true, true);
      
      elm[0].dispatchEvent(e);
      
      expect(altClickHandler).toHaveBeenCalled();
    }));
    
    it("should affect proper CSS class regarding the model", function() {
      var c = function() {return expect(elm[0].getAttribute("class"))};
      
      $scope.$apply(function() {$scope.data = {column: 0, row: 0};});
      c().toContain("tile");
      c().toContain("unknown");
      c().not.toContain("discovered");
      c().not.toContain("flagged");
      
      $scope.$apply(function() {$scope.data.flagged = true; });
      c().toContain("tile");
      c().not.toContain("unknown");
      c().not.toContain("discovered");
      c().toContain("flagged");
      
      $scope.$apply(function() {$scope.data.flagged = false; $scope.data.discovered = true; });
      c().toContain("tile");
      c().not.toContain("unknown");
      c().toContain("discovered");
      c().not.toContain("flagged");
      
      $scope.$apply(function() {$scope.data.discovered = false; $scope.data.exploded = true; });
      c().toContain("tile");
      c().not.toContain("unknown");
      c().not.toContain("discovered");
      c().not.toContain("flagged");
      c().toContain("boom");
    });
  });
  
  describe("$utils", function() {
    describe("showTileContent", function() {
      it("should show a mined tile", inject(function($utils) {
        var tile = {isMined: true};
        $utils.showTileContent([], tile);
        
        expect(tile.flagged).toBeTruthy();
      }));
      
      it("should show a non-mined tile", inject(function($utils) {
        var tile = {};
        $utils.showTileContent([], tile);
        
        expect(tile.discovered).toBeTruthy();
        expect(tile.value).toBe(0);
      }));
    });
    
    describe("updateAjacent", function() {
      it("should update adjacent tiles - corner", inject(function($utils) {
        var tiles = [
          [{flagged: false, discovered: false}, {flagged: false, discovered: false, isMined: true}],
          [{flagged: false, discovered: false, isMined: true}, {flagged: false, discovered: false, isMined: true}]
        ];
        
        $utils.updateAdjacent(tiles, tiles[0][0]);
        
        expect(tiles).toEqual([
          [{flagged: false, discovered: true, value: 3}, {flagged: false, discovered: false, isMined: true}],
          [{flagged: false, discovered: false, isMined: true}, {flagged: false, discovered: false, isMined: true}]
        ]);
      }));
      
      it("should update adjacent tiles - zero adjacent mines", inject(function($utils) {
        var tiles = [
          [{flagged: false, discovered: false}, {flagged: false, discovered: false}],
          [{flagged: false, discovered: false}, {flagged: false, discovered: false}]
        ];
        
        $utils.updateAdjacent(tiles, tiles[0][0]);
        
        expect(tiles).toEqual([
          [{flagged: false, discovered: true, value: 0}, {flagged: false, discovered: true, value: 0}],
          [{flagged: false, discovered: true, value: 0}, {flagged: false, discovered: true, value: 0}]
        ]);
      }));
    });
    
    it("should generate a model", inject(function($utils) {
      var expected = [
        [{flagged: false, discovered: false}, {flagged: false, discovered: false}],
        [{flagged: false, discovered: false}, {flagged: false, discovered: false}]
      ];
      
      expect($utils.generateTiles(2, 2)).toEqual(expected);
    }));
    
    it("should add mines", inject(function($utils) {
      var tiles = [
        [{}, {}], // here we don't care what's inside the model
        [{}, {}]
      ];
      
      $utils.addMines(tiles, 2);
      
      var addedMinesCount = 0;
      
      tiles.forEach(function(row) {
        addedMinesCount += row.filter(function(tile) {return tile.isMined;}).length;
      });
      
      expect(addedMinesCount).toBe(2);
    }));
    
    it("should throw an error when requesting too many mines", inject(function($utils) {
      var tiles = [
        [{}, {}],
        [{}, {}]
      ];
      
      expect(function() {$utils.addMines(tiles, 6);}).toThrow();;
    }));
  });
});